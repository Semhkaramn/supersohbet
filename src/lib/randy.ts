// Randy Sistemi - Otomatik Rastgele Ödül Dağıtım Sistemi

import { prisma } from '@/lib/prisma'

interface RandySlotCheckResult {
  assigned: boolean
  winner?: {
    userId: string
    username?: string
    firstName?: string
    siteUsername?: string
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

    // Önce grup ID'sinin ayarlanıp ayarlanmadığını kontrol et
    const groupIdSetting = await prisma.settings.findUnique({
      where: { key: 'activity_group_id' }
    })

    if (!groupIdSetting?.value || groupIdSetting.value === '') {
      console.log('⚠️ Randy kontrolü atlandı: Aktif grup ID ayarlanmamış')
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
        // Uygun kullanıcıları bul (slot zamanını da gönder)
        const winner = await findEligibleWinner(schedule, slot.id, slot.schedTime)

        if (winner) {
          // Slotu güncelle
          await prisma.randySlot.update({
            where: { id: slot.id },
            data: {
              assigned: true,
              assignedUser: winner.userId,
              assignedUsername: winner.username,
              assignedFirstName: winner.firstName,
              assignedSiteUsername: winner.siteUsername,
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

          console.log(`✅ Randy kazanan atandı: ${winner.siteUsername || winner.firstName || winner.username} (${winner.userId})`)
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
 * Slot zamanında mesaj yazan ve şartları karşılayan ilk kişiyi seçer
 */
async function findEligibleWinner(
  schedule: any,
  slotId: string,
  slotTime: Date
): Promise<{ userId: string; username?: string; firstName?: string; siteUsername?: string } | null> {
  try {
    // ========== YENİ: TELEGRAM GRUP MESAJLARINA GÖRE KAZANAN BUL ==========
    // Slot zamanından SONRA mesaj yazmış telegram kullanıcılarını bul
    // İLK mesaj yazan ve şartları karşılayan kişi kazanır
    const messagesAfterSlot = await prisma.telegramGroupMessage.findMany({
      where: {
        createdAt: {
          gte: slotTime // Slot zamanından sonra (veya o dakikada)
        }
      },
      orderBy: {
        createdAt: 'asc' // En erken mesajdan başlayarak sırala - ilk yazan kazanır
      },
      include: {
        telegramUser: {
          include: {
            linkedUser: true
          }
        }
      }
    })

    if (messagesAfterSlot.length === 0) {
      console.log(`⚠️ Slot zamanından sonra mesaj bulunamadı: ${slotTime.toISOString()}`)
      return null
    }

    // Telegram grup kullanıcıları için filtre hazırla
    const telegramWhereClause: any = {}

    // Banlı kullanıcıları hariç tut (siteye kayıtlı ve banlıysa)
    // NOT: Siteye kayıtlı olmayan kullanıcılar banlı olamaz, onlar katılabilir
    const bannedTelegramIds = await prisma.user.findMany({
      where: {
        isBanned: true,
        telegramId: { not: null }
      },
      select: { telegramId: true }
    })

    if (bannedTelegramIds.length > 0) {
      const bannedTgUsers = await prisma.telegramGroupUser.findMany({
        where: {
          telegramId: {
            in: bannedTelegramIds.map(u => u.telegramId).filter(Boolean) as string[]
          }
        },
        select: { id: true }
      })

      if (bannedTgUsers.length > 0) {
        const existingNotIn = (telegramWhereClause.id as any)?.notIn || []
        telegramWhereClause.id = {
          ...telegramWhereClause.id,
          notIn: [...existingNotIn, ...bannedTgUsers.map(u => u.id)]
        }
      }
    }

    // Minimum mesaj kontrolü - belirli dönemde yeterli mesaj atmış kullanıcıları filtrele
    if (schedule.minMessages > 0 && schedule.messagePeriod !== 'none') {
      const periodFilter = getMessagePeriodFilterForTelegram(schedule.messagePeriod)

      if (periodFilter) {
        // Belirli dönemde minimum mesaj sayısını karşılayan telegram kullanıcılarını bul
        const eligibleTgUserIds = await prisma.telegramGroupMessage.groupBy({
          by: ['telegramUserId'],
          where: periodFilter,
          having: {
            telegramUserId: {
              _count: {
                gte: schedule.minMessages
              }
            }
          }
        })

        if (eligibleTgUserIds.length === 0) {
          console.log(`⚠️ Minimum mesaj şartını karşılayan kullanıcı bulunamadı. Min: ${schedule.minMessages}, Dönem: ${schedule.messagePeriod}`)
          return null
        }

        // Sadece minimum mesaj şartını karşılayanları filtrele
        telegramWhereClause.id = {
          in: eligibleTgUserIds.map(u => u.telegramUserId)
        }
      }
    }

    // Kullanıcı başına bir kez kuralı - bu schedule'da daha önce kazananları hariç tut
    if (schedule.onePerUser) {
      const alreadyWonSlots = await prisma.randySlot.findMany({
        where: {
          scheduleId: schedule.id,
          assigned: true,
          assignedUser: { not: null }
        },
        select: { assignedUser: true }
      })

      const wonTelegramIds = alreadyWonSlots
        .map(s => s.assignedUser)
        .filter(Boolean) as string[]

      if (wonTelegramIds.length > 0) {
        // Telegram ID'lere göre TelegramGroupUser'ları bul
        const wonTgUsers = await prisma.telegramGroupUser.findMany({
          where: { telegramId: { in: wonTelegramIds } },
          select: { id: true }
        })

        if (wonTgUsers.length > 0) {
          const existingNotIn = (telegramWhereClause.id as any)?.notIn || []
          telegramWhereClause.id = {
            ...telegramWhereClause.id,
            notIn: [...existingNotIn, ...wonTgUsers.map(u => u.id)]
          }
        }
      }
    }

    // Uygun telegram kullanıcılarını getir
    const eligibleUsers = await prisma.telegramGroupUser.findMany({
      where: telegramWhereClause,
      include: {
        linkedUser: true
      }
    })

    if (eligibleUsers.length === 0) {
      return null
    }

    // Slot zamanından SONRA mesaj yazan kullanıcılar arasından şartları karşılayan İLK kişiyi seç
    for (const message of messagesAfterSlot) {
      const isEligible = eligibleUsers.some(u => u.id === message.telegramUserId)

      if (isEligible && message.telegramUser) {
        const tgUser = message.telegramUser
        console.log(`✅ İlk uygun kazanan bulundu: ${tgUser.linkedUser?.siteUsername || tgUser.firstName || tgUser.username} (${tgUser.telegramId}) - Slot zamanı: ${slotTime.toISOString()} - Mesaj zamanı: ${message.createdAt.toISOString()}`)
        return {
          userId: tgUser.telegramId,
          username: tgUser.username || undefined,
          firstName: tgUser.firstName || undefined,
          siteUsername: tgUser.linkedUser?.siteUsername || undefined
        }
      }
    }

    // Eğer slot zamanından sonra şartları karşılayan kullanıcı bulunamazsa kazanan yok
    console.log(`⚠️ Slot zamanından sonra şartları karşılayan kullanıcı bulunamadı. Slot zamanı: ${slotTime.toISOString()}`)
    return null
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
    case 'month': {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      return { createdAt: { gte: monthStart } }
    }
    case 'all':
      return {} // Tüm mesajlar
    default:
      return null // Period kontrolü yok
  }
}

/**
 * Telegram grup mesajları için mesaj dönemi filtresini oluşturur
 */
function getMessagePeriodFilterForTelegram(period: string): any {
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
    case 'month': {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      return { createdAt: { gte: monthStart } }
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
  winner: { userId: string; username?: string; firstName?: string; siteUsername?: string },
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
