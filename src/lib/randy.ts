// Randy Sistemi - Otomatik Rastgele Ödül Dağıtım Sistemi

import { prisma } from '@/lib/prisma'

interface RandySlotCheckResult {
  assigned: boolean
  winner?: {
    userId: string
    username?: string
    firstName?: string
  }
  prizeText?: string
  slotId?: string
  scheduleId?: string
}

/**
 * Aktif Randy schedule'ları kontrol eder ve zamanı gelen slotlara kazanan atar
 */
export async function checkRandySlots(): Promise<RandySlotCheckResult[]> {
  try {
    const now = new Date()

    // Önce grubun aktif olup olmadığını kontrol et
    const groupStatus = await prisma.settings.findUnique({
      where: { key: 'activity_group_status' }
    })

    if (groupStatus?.value !== 'active') {
      console.log('⚠️ Randy kontrolü atlandı: Grup aktif değil')
      return []
    }

    // Aktif schedule'ları bul
    const activeSchedules = await prisma.randySchedule.findMany({
      where: { status: 'active' },
      include: {
        slots: {
          where: {
            assigned: false,
            schedTime: { lte: now }
          },
          orderBy: { schedTime: 'asc' }
        }
      }
    })

    const results: RandySlotCheckResult[] = []

    for (const schedule of activeSchedules) {
      for (const slot of schedule.slots) {
        // Uygun kullanıcıları bul
        const winner = await findEligibleWinner(schedule, slot.id)

        if (winner) {
          // Slotu güncelle
          await prisma.randySlot.update({
            where: { id: slot.id },
            data: {
              assigned: true,
              assignedUser: winner.userId,
              assignedUsername: winner.username,
              assignedFirstName: winner.firstName,
              assignedAt: now
            }
          })

          results.push({
            assigned: true,
            winner,
            prizeText: schedule.prizeText,
            slotId: slot.id,
            scheduleId: schedule.id
          })

          console.log(`✅ Randy kazanan atandı: ${winner.firstName || winner.username} (${winner.userId})`)
        } else {
          console.log(`⚠️ Randy slot için uygun kullanıcı bulunamadı: ${slot.id}`)
          results.push({ assigned: false })
        }
      }

      // Schedule'daki tüm slotlar tamamlandıysa durumu güncelle
      const totalSlots = await prisma.randySlot.count({
        where: { scheduleId: schedule.id }
      })

      const assignedSlots = await prisma.randySlot.count({
        where: { scheduleId: schedule.id, assigned: true }
      })

      if (totalSlots === assignedSlots) {
        await prisma.randySchedule.update({
          where: { id: schedule.id },
          data: { status: 'completed' }
        })
        console.log(`✅ Randy schedule tamamlandı: ${schedule.id}`)
      }
    }

    return results
  } catch (error) {
    console.error('Randy slot check error:', error)
    return []
  }
}

/**
 * Slot için uygun kazanan kullanıcı bulur
 */
async function findEligibleWinner(
  schedule: any,
  slotId: string
): Promise<{ userId: string; username?: string; firstName?: string } | null> {
  try {
    // Mesaj filtrelerini hazırla
    const whereClause: any = {
      isBanned: false
    }

    // Minimum mesaj kontrolü
    if (schedule.minMessages > 0 && schedule.messagePeriod !== 'none') {
      const periodFilter = getMessagePeriodFilter(schedule.messagePeriod)

      if (periodFilter) {
        // Belirli dönemde minimum mesaj sayısını karşılayanları bul
        const eligibleUserIds = await prisma.messageStats.groupBy({
          by: ['userId'],
          where: periodFilter,
          having: {
            userId: {
              _count: {
                gte: schedule.minMessages
              }
            }
          }
        })

        if (eligibleUserIds.length === 0) {
          return null
        }

        whereClause.id = {
          in: eligibleUserIds.map(u => u.userId)
        }
      }
    }

    // Kullanıcı başına bir kez kuralı
    if (schedule.onePerUser) {
      // Bu schedule'da zaten kazanan kullanıcıları hariç tut
      const alreadyWonUserIds = await prisma.randySlot.findMany({
        where: {
          scheduleId: schedule.id,
          assigned: true,
          assignedUser: { not: null }
        },
        select: { assignedUser: true }
      })

      const wonUserIds = alreadyWonUserIds
        .map(s => s.assignedUser)
        .filter(Boolean) as string[]

      if (wonUserIds.length > 0) {
        // Telegram ID'lerini User ID'lerine çevir
        const wonUsers = await prisma.user.findMany({
          where: { telegramId: { in: wonUserIds } },
          select: { id: true }
        })

        if (wonUsers.length > 0) {
          whereClause.id = {
            ...whereClause.id,
            notIn: wonUsers.map(u => u.id)
          }
        }
      }
    }

    // Uygun kullanıcıları getir
    const eligibleUsers = await prisma.user.findMany({
      where: whereClause
    })

    if (eligibleUsers.length === 0) {
      return null
    }

    // Rastgele bir kazanan seç
    const randomIndex = Math.floor(Math.random() * eligibleUsers.length)
    const winner = eligibleUsers[randomIndex]

    return {
      userId: winner.telegramId,
      username: winner.username || undefined,
      firstName: winner.firstName || undefined
    }
  } catch (error) {
    console.error('Find eligible winner error:', error)
    return null
  }
}

/**
 * Mesaj dönemi filtresini oluşturur
 */
function getMessagePeriodFilter(period: string): any {
  const now = new Date()

  switch (period) {
    case 'today': {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      return { createdAt: { gte: todayStart } }
    }
    case 'week': {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      return { createdAt: { gte: weekAgo } }
    }
    case 'all':
      return {} // Tüm mesajlar
    default:
      return null // Period kontrolü yok
  }
}

/**
 * Randy kazananını Telegram'da duyurur
 */
export async function announceRandyWinner(
  botToken: string,
  chatId: number,
  winner: { userId: string; username?: string; firstName?: string },
  prizeText: string,
  pinMessage: boolean = true,
  customTemplate?: string
): Promise<boolean> {
  try {
    const userMention = winner.username
      ? `@${winner.username}`
      : winner.firstName
        ? `[${winner.firstName}](tg://user?id=${winner.userId})`
        : `Kullanıcı ${winner.userId}`

    // Şablon varsa kullan, yoksa varsayılan mesaj
    let message = customTemplate || `
🎉 **Randy Kazananı!**

{mention} tebrikler!

🎁 **Ödül:** {prize}

Ödülünüzü almak için lütfen yöneticilerle iletişime geçin.
    `.trim()

    // Placeholder'ları değiştir
    message = message
      .replace(/{mention}/g, userMention)
      .replace(/{username}/g, winner.username || winner.firstName || 'Kullanıcı')
      .replace(/{prize}/g, prizeText)
      .replace(/{firstname}/g, winner.firstName || 'Kullanıcı')
      .replace(/{userId}/g, winner.userId)

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown'
      })
    })

    const data = await response.json()

    if (data.ok && pinMessage && data.result?.message_id) {
      // Mesajı sabitle
      const pinUrl = `https://api.telegram.org/bot${botToken}/pinChatMessage`
      await fetch(pinUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: data.result.message_id,
          disable_notification: false
        })
      })
    }

    return data.ok
  } catch (error) {
    console.error('Announce randy winner error:', error)
    return false
  }
}

/**
 * Randy kazananına DM gönderir (sadece /start yapan kullanıcılara)
 */
export async function sendRandyDM(
  botToken: string,
  winner: { userId: string; username?: string; firstName?: string },
  prizeText: string,
  customTemplate?: string
): Promise<boolean> {
  try {
    // Kullanıcının /start yapıp yapmadığını kontrol et
    const user = await prisma.user.findUnique({
      where: { telegramId: winner.userId },
      select: { hadStart: true }
    })

    if (!user || !user.hadStart) {
      console.log(`⚠️ Kullanıcı /start yapmamış, DM gönderilemedi: ${winner.userId}`)
      return false
    }

    // Şablon varsa kullan, yoksa varsayılan mesaj
    let message = customTemplate || `
🎉 **Tebrikler! Randy Kazandınız!**

Merhaba {firstname},

Randy çekilişinde kazanan siz oldunuz!

🎁 **Ödülünüz:** {prize}

Ödülünüzü almak için lütfen grup yöneticileriyle iletişime geçin.

Tebrikler! 🎊
    `.trim()

    const userMention = winner.username
      ? `@${winner.username}`
      : winner.firstName
        ? `[${winner.firstName}](tg://user?id=${winner.userId})`
        : `Kullanıcı ${winner.userId}`

    // Placeholder'ları değiştir
    message = message
      .replace(/{mention}/g, userMention)
      .replace(/{username}/g, winner.username || winner.firstName || 'Kullanıcı')
      .replace(/{prize}/g, prizeText)
      .replace(/{firstname}/g, winner.firstName || 'Kullanıcı')
      .replace(/{userId}/g, winner.userId)

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: winner.userId,
        text: message,
        parse_mode: 'Markdown'
      })
    })

    const data = await response.json()

    if (data.ok) {
      console.log(`✅ Randy DM gönderildi: ${winner.userId}`)
      return true
    } else {
      console.log(`❌ Randy DM gönderilemedi: ${winner.userId}`, data)
      return false
    }
  } catch (error) {
    console.error('Send randy DM error:', error)
    return false
  }
}

/**
 * Randy başlangıç duyurusunu gönderir
 */
export async function announceRandyStart(
  botToken: string,
  chatId: number,
  schedule: {
    winnerCount: number
    distributionHours: number
    prizeText: string
  },
  pinMessage: boolean = true,
  customTemplate?: string
): Promise<boolean> {
  try {
    const endTime = new Date(Date.now() + schedule.distributionHours * 60 * 60 * 1000)
    const endTimeStr = endTime.toLocaleString('tr-TR', {
      timeZone: 'Europe/Istanbul',
      dateStyle: 'short',
      timeStyle: 'short'
    })

    // Şablon varsa kullan, yoksa varsayılan mesaj
    let message = customTemplate || `
🎊 **Randy Başladı!**

Yeni bir Randy çekilişi başladı!

🎁 **Ödül:** {prize}
👥 **Kazanan Sayısı:** {winners}
⏱️ **Süre:** {hours} saat
📅 **Bitiş:** {endtime}

Çekilişe katılmak için sadece aktif olun ve mesaj yazın. Kazananlar rastgele seçilecek!

Şans herkese! 🍀
    `.trim()

    // Placeholder'ları değiştir
    message = message
      .replace(/{prize}/g, schedule.prizeText)
      .replace(/{winners}/g, String(schedule.winnerCount))
      .replace(/{hours}/g, String(schedule.distributionHours))
      .replace(/{endtime}/g, endTimeStr)

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown'
      })
    })

    const data = await response.json()

    if (data.ok && pinMessage && data.result?.message_id) {
      // Mesajı sabitle
      const pinUrl = `https://api.telegram.org/bot${botToken}/pinChatMessage`
      await fetch(pinUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: data.result.message_id,
          disable_notification: false
        })
      })
    }

    return data.ok
  } catch (error) {
    console.error('Announce randy start error:', error)
    return false
  }
}
