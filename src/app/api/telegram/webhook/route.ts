import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTurkeyDate } from '@/lib/utils'
import { notifyLevelUp } from '@/lib/notifications'
import { checkRandySlots, announceRandyWinner } from '@/lib/randy'
import {
  getRollState,
  startRoll,
  saveStep,
  startBreak,
  resumeRoll,
  stopRoll,
  trackUserMessage,
  cleanInactiveUsers,
  getStatusList,
  getStepList,
  clearRollData,
  lockRoll,
  unlockRoll
} from '@/lib/roll-system'

// Ayarları cache'e al (performans için)
let settingsCache: Record<string, string> = {}
let lastCacheUpdate = 0
const CACHE_TTL = 60000 // 1 dakika

async function getSettings() {
  const now = Date.now()
  if (now - lastCacheUpdate > CACHE_TTL) {
    const settings = await prisma.settings.findMany()
    settingsCache = settings.reduce((acc: Record<string, string>, s) => ({ ...acc, [s.key]: s.value }), {})
    lastCacheUpdate = now
  }
  return settingsCache
}

function getSetting(key: string, defaultValue: string = '0'): string {
  return settingsCache[key] || defaultValue
}

async function sendTelegramMessage(chatId: number, text: string, keyboard?: any) {
  const botToken = getSetting('telegram_bot_token', '')
  if (!botToken) {
    console.error('Bot token not set')
    return
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`
  const body: any = {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown'
  }

  if (keyboard) {
    body.reply_markup = keyboard
  }

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
  } catch (error) {
    console.error('Error sending message:', error)
  }
}

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  const botToken = getSetting('telegram_bot_token', '')
  if (!botToken) return

  const url = `https://api.telegram.org/bot${botToken}/answerCallbackQuery`
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text })
    })
  } catch (error) {
    console.error('Error answering callback:', error)
  }
}

// Ban kontrolü
async function checkUserBan(userId: string): Promise<{ isBanned: boolean; banReason?: string }> {
  try {
    const user = await prisma.user.findUnique({
      where: { telegramId: userId },
      select: { isBanned: true, banReason: true }
    })

    return {
      isBanned: user?.isBanned || false,
      banReason: user?.banReason || undefined
    }
  } catch (error) {
    console.error('Error checking ban status:', error)
    return { isBanned: false }
  }
}

// Admin kontrolü - Hem env'den hem grup adminlerinden kontrol eder
async function checkAdmin(chatId: number, userId: number): Promise<boolean> {
  try {
    // ENV'den tanımlı adminler
    const adminIds = getSetting('roll_admin_ids', '')
    if (adminIds) {
      const adminList = adminIds.split(',').map(id => id.trim())
      if (adminList.includes(String(userId))) {
        return true
      }
    }

    // Grup adminlerini kontrol et
    const botToken = getSetting('telegram_bot_token', '')
    if (!botToken) return false

    const url = `https://api.telegram.org/bot${botToken}/getChatMember`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, user_id: userId })
    })

    const data = await response.json()
    if (data.ok && data.result) {
      const status = data.result.status
      return status === 'administrator' || status === 'creator'
    }

    return false
  } catch (error) {
    console.error('Error checking admin:', error)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const update = await request.json()

    // Ayarları yükle
    await getSettings()

    // Bakım modu kontrolü
    if (getSetting('maintenance_mode') === 'true') {
      return NextResponse.json({ ok: true, message: 'Maintenance mode' })
    }

    // Callback query işle
    if (update.callback_query) {
      const query = update.callback_query
      const chatId = query.message?.chat.id
      const userId = String(query.from.id)

      // Ban kontrolü
      const banStatus = await checkUserBan(userId)
      if (banStatus.isBanned) {
        await answerCallbackQuery(query.id)
        if (chatId) {
          const banMessage = `
🚫 **Hesabınız Yasaklandı**

${banStatus.banReason ? `Neden: ${banStatus.banReason}` : 'Sistem kurallarını ihlal ettiniz.'}

Bot özelliklerini kullanmanız engellenmiştir.
          `.trim()
          await sendTelegramMessage(chatId, banMessage)
        }
        return NextResponse.json({ ok: true })
      }

      if (query.data === 'my_stats') {
        const user = await prisma.user.findUnique({
          where: { telegramId: userId },
          include: { rank: true }
        })

        const statsMessage = user ? `
📊 **Senin İstatistiklerin**

🌟 Puan: ${user.points.toLocaleString()}
⭐ XP: ${user.xp.toLocaleString()}
🏆 Rütbe: ${user.rank?.icon || '🌱'} ${user.rank?.name || 'Yeni Başlayan'}
💬 Mesaj: ${user.totalMessages.toLocaleString()}

Daha fazla bilgi için Ödül Merkezi'ne git!
        `.trim() : `
📊 **Senin İstatistiklerin**

🌟 Puan: 0
⭐ XP: 0
🏆 Rütbe: Yeni Başlayan
💬 Mesaj: 0

Daha fazla bilgi için Ödül Merkezi'ne git!
        `.trim()

        await answerCallbackQuery(query.id)
        if (chatId) {
          await sendTelegramMessage(chatId, statsMessage)
        }
      }

      return NextResponse.json({ ok: true })
    }

    // Mesaj varsa işle
    if (update.message && update.message.text) {
      const message = update.message
      const chatId = message.chat.id
      const userId = String(message.from.id)
      const username = message.from.username
      const firstName = message.from.first_name
      const lastName = message.from.last_name
      const messageText = message.text

      // Aktif grup kontrolü - Sadece GRUP mesajlarında kontrol et, private chat'leri geçir
      const chatType = message.chat.type
      const activityGroupId = getSetting('activity_group_id', '')

      // Eğer grup veya supergroup ise ve activity_group_id ayarlanmışsa kontrol et
      if ((chatType === 'group' || chatType === 'supergroup') && activityGroupId && activityGroupId.trim() !== '') {
        const chatIdStr = String(chatId)
        const isActivityGroup = chatIdStr === activityGroupId

        console.log(`🔍 Grup Kontrolü:`, {
          chatType,
          messageChatId: chatIdStr,
          activityGroupId: activityGroupId,
          isMatch: isActivityGroup,
          from: `${firstName || username || userId}`
        })

        if (!isActivityGroup) {
          console.log(`⏭️ Mesaj aktif grupta değil - atlandı`)
          return NextResponse.json({ ok: true, message: 'Not activity group' })
        }

        console.log(`✅ Mesaj aktif grupta - işleniyor`)
      } else if (chatType === 'private') {
        console.log(`💬 Private mesaj - işleniyor (grup kontrolü atlandı)`)
      } else {
        console.log(`⚠️ Aktif grup ayarlanmamış veya private chat - tüm mesajlar işleniyor`)
      }

      // /start komutu hariç her şey için ban kontrolü
      if (messageText !== '/start' && !messageText.startsWith('/start ')) {
        const banStatus = await checkUserBan(userId)
        if (banStatus.isBanned) {
          const banMessage = `
🚫 **Hesabınız Yasaklandı**

${banStatus.banReason ? `Neden: ${banStatus.banReason}` : 'Sistem kurallarını ihlal ettiniz.'}

Bot özelliklerini kullanmanız engellenmiştir.
          `.trim()
          await sendTelegramMessage(chatId, banMessage)
          return NextResponse.json({ ok: true })
        }
      }

      // ROLL SİSTEMİ - Sadece gruplarda çalışır
      if (chatType === 'group' || chatType === 'supergroup') {
        const groupId = String(chatId)
        const text = messageText.trim()

        // "liste" komutu - Herkes kullanabilir
        if (text.toLowerCase() === 'liste') {
          // Roll sistemi aktif mi kontrol et
          const rollEnabled = getSetting('roll_enabled', 'true') === 'true'
          if (!rollEnabled) {
            return NextResponse.json({ ok: true })
          }

          const statusMsg = getStatusList(groupId)
          await sendTelegramMessage(chatId, statusMsg)
          return NextResponse.json({ ok: true })
        }

        // Roll komutları - Sadece adminler
        if (text.startsWith('roll ') || text === 'roll') {
          // Roll sistemi aktif mi kontrol et
          const rollEnabled = getSetting('roll_enabled', 'true') === 'true'
          if (!rollEnabled) {
            return NextResponse.json({ ok: true })
          }

          const isAdmin = await checkAdmin(chatId, Number(userId))

          const parts = text.split(' ')

          if (parts.length === 1) {
            // Sadece "roll" yazılmış - sessiz kal
            return NextResponse.json({ ok: true })
          }

          const command = parts.slice(1).join(' ').toLowerCase()

          // roll <sayı> - Roll başlat
          if (/^\d+$/.test(command)) {
            if (!isAdmin) return NextResponse.json({ ok: true })

            const duration = Number.parseInt(command)
            startRoll(groupId, duration)

            await sendTelegramMessage(
              chatId,
              `✅ Roll Başladı!\n⏳ ${duration} dakika içinde mesaj yazmayan listeden çıkarılır.`
            )
            return NextResponse.json({ ok: true })
          }

          // roll adım - Adım kaydet ve duraklat
          if (command === 'adım' || command === 'adim') {
            if (!isAdmin) return NextResponse.json({ ok: true })

            const result = saveStep(groupId)

            if (!result.success) {
              await sendTelegramMessage(chatId, result.message)
              return NextResponse.json({ ok: true })
            }

            const stepList = getStepList(groupId)
            await sendTelegramMessage(
              chatId,
              `📌 Adım ${result.stepNumber} Kaydedildi!\n\n${stepList}`
            )
            return NextResponse.json({ ok: true })
          }

          // roll mola - Mola başlat
          if (command === 'mola') {
            if (!isAdmin) return NextResponse.json({ ok: true })

            const state = getRollState(groupId)

            if (state.status === 'stopped') {
              await sendTelegramMessage(chatId, '⚠️ Roll aktif değil. Mola başlatılamaz.')
              return NextResponse.json({ ok: true })
            }

            if (state.status === 'break') {
              await sendTelegramMessage(chatId, '⚠️ Zaten molada.')
              return NextResponse.json({ ok: true })
            }

            startBreak(groupId)
            await sendTelegramMessage(chatId, '☕ Mola başladı! Liste korunuyor.')
            return NextResponse.json({ ok: true })
          }

          // roll devam - Akıllı devam (hem paused hem break için)
          if (command === 'devam') {
            if (!isAdmin) return NextResponse.json({ ok: true })

            const state = getRollState(groupId)

            if (state.status !== 'paused' && state.status !== 'break') {
              await sendTelegramMessage(chatId, '⚠️ Roll zaten aktif veya durdurulmuş.')
              return NextResponse.json({ ok: true })
            }

            const wasBreak = state.status === 'break'
            resumeRoll(groupId)

            // Get updated state after resumeRoll
            const updatedState = getRollState(groupId)
            const stepList = getStepList(groupId)
            const nextStep = updatedState.currentStep + 1
            const statusText = updatedState.status === 'active' ? '▶️ Aktif' : '⏸ Duraklatıldı'

            if (wasBreak) {
              await sendTelegramMessage(
                chatId,
                `${stepList ? stepList + '\n\n' : ''}✅ Mola bitti! ${statusText}\n⏳ ${updatedState.activeDuration} dakika kuralı geçerlidir.`
              )
            } else {
              await sendTelegramMessage(
                chatId,
                `${stepList ? stepList + '\n\n' : ''}▶️ Adım ${nextStep}'e geçildi!\n⏳ ${updatedState.activeDuration} dakika kuralı geçerlidir.`
              )
            }

            return NextResponse.json({ ok: true })
          }

          // roll kilit - Yeni kullanıcı girişini kapat
          if (command === 'kilit') {
            if (!isAdmin) return NextResponse.json({ ok: true })

            const state = getRollState(groupId)

            if (state.status === 'stopped') {
              await sendTelegramMessage(chatId, '⚠️ Roll aktif değil.')
              return NextResponse.json({ ok: true })
            }

            if (state.status === 'locked') {
              await sendTelegramMessage(chatId, '⚠️ Liste zaten kilitli.')
              return NextResponse.json({ ok: true })
            }

            lockRoll(groupId)
            await sendTelegramMessage(chatId, '🔒 Liste kilitlendi! Yeni kullanıcı giremez, mevcut kullanıcılar devam edebilir.')
            return NextResponse.json({ ok: true })
          }

          // roll bitir - Sonlandır
          if (command === 'bitir') {
            if (!isAdmin) return NextResponse.json({ ok: true })

            const state = getRollState(groupId)

            if (state.status === 'stopped') {
              await sendTelegramMessage(chatId, '⚠️ Roll zaten durdurulmuş.')
              return NextResponse.json({ ok: true })
            }

            stopRoll(groupId)

            const stepList = getStepList(groupId)

            if (!stepList) {
              await sendTelegramMessage(chatId, '✅ Roll Sonlandı!\n📭 Hiç adım kaydedilmedi.')
            } else {
              await sendTelegramMessage(chatId, `🏁 Roll Sonlandı!\n\n${stepList}`)
            }

            clearRollData(groupId)
            return NextResponse.json({ ok: true })
          }

          // Geçersiz komut - sessiz kal
          return NextResponse.json({ ok: true })
        }

        // Normal mesaj - tracking aktifse kaydet
        const state = getRollState(groupId)
        if (state.status === 'active' || state.status === 'locked') {
          trackUserMessage(groupId, userId, username || null, firstName || null)
        }
      }

      // RANDY SİSTEMİ - Her mesajda slot kontrolü yap (sadece gruplarda)
      if (chatType === 'group' || chatType === 'supergroup') {
        try {
          const randyResults = await checkRandySlots()
          const botToken = getSetting('telegram_bot_token', '')
          const sendAnnouncement = getSetting('randy_send_announcement', 'true') === 'true'
          const sendDM = getSetting('randy_send_dm', 'true') === 'true'
          const pinWinnerMessage = getSetting('randy_pin_winner_message', 'true') === 'true'
          const groupTemplate = getSetting('randy_group_template', '')
          const dmTemplate = getSetting('randy_dm_template', '')

          // Kazananları duyur ve DM gönder
          for (const result of randyResults) {
            if (result.assigned && result.winner && result.prizeText && botToken) {
              // Grup duyurusu gönder
              if (sendAnnouncement) {
                const success = await announceRandyWinner(
                  botToken,
                  chatId,
                  result.winner,
                  result.prizeText,
                  pinWinnerMessage,
                  groupTemplate || undefined
                )

                if (success && result.slotId) {
                  // Slot'u güncelle - duyuruldu olarak işaretle
                  await prisma.randySlot.update({
                    where: { id: result.slotId },
                    data: { groupAnnounced: true }
                  })
                }
              }

              // DM gönder (sadece /start yapmış kullanıcılara)
              if (sendDM) {
                const { sendRandyDM } = await import('@/lib/randy')
                const dmSuccess = await sendRandyDM(
                  botToken,
                  result.winner,
                  result.prizeText,
                  dmTemplate || undefined
                )

                if (dmSuccess && result.slotId) {
                  // Slot'u güncelle - DM gönderildi olarak işaretle
                  await prisma.randySlot.update({
                    where: { id: result.slotId },
                    data: { dmSent: true }
                  })
                }
              }
            }
          }
        } catch (error) {
          console.error('Randy check error:', error)
        }
      }

      // /start komutu kontrolü
      if (messageText === '/start' || messageText.startsWith('/start ')) {
        const webAppUrl = getSetting('telegram_webhook_url', '').replace('/api/telegram/webhook', '') || process.env.NEXT_PUBLIC_APP_URL || 'https://soft-fairy-c52849.netlify.app'

        // Referans kodu kontrolü (örn: /start ref_123456789)
        const startParam = messageText.split(' ')[1]
        let referrerTelegramId: string | null = null

        // Yeni format: ref_TELEGRAM_ID
        if (startParam && startParam.startsWith('ref_')) {
          referrerTelegramId = startParam.replace('ref_', '')
        }
        // Eski format için geriye dönük uyumluluk (referralCode)
        const legacyReferralCode = startParam && !startParam.startsWith('ref_') ? startParam : null

        const welcomeMessage = `
🎉 **SüperSohbet Bot'a Hoş Geldin!**

Merhaba ${firstName}!

Bu bot ile:
✨ Mesaj göndererek puan kazan
🏆 Rütbe atla
🎁 Günlük şans çarkını çevir
🛍️ Puanlarınla ödüller satın al
💰 Sponsor olarak platformu destekle
👥 Arkadaşlarını davet et, bonus kazan

Başlamak için yanındaki menü butonuna tıkla! 👆
        `.trim()

        // Menu button BotFather'da app olarak ayarlandığı için
        // inline keyboard butonlarını kaldırdık
        await sendTelegramMessage(chatId, welcomeMessage)

        // Kullanıcıyı kaydet
        const allowNewUsers = getSetting('allow_new_users', 'true') === 'true'
        if (allowNewUsers) {
          // Önce kullanıcının var olup olmadığını kontrol et
          const existingUser = await prisma.user.findUnique({
            where: { telegramId: userId }
          })

          // Yeni kullanıcı ise ve referans kodu varsa
          if (!existingUser && (referrerTelegramId || legacyReferralCode)) {
            // Referans koduna sahip kullanıcıyı bul
            let referrer = null

            // Yeni format: Telegram ID ile ara
            if (referrerTelegramId) {
              referrer = await prisma.user.findUnique({
                where: { telegramId: referrerTelegramId }
              })
            }
            // Eski format: Referral code ile ara (geriye dönük uyumluluk)
            else if (legacyReferralCode) {
              referrer = await prisma.user.findUnique({
                where: { referralCode: legacyReferralCode }
              })
            }

            if (referrer && referrer.telegramId !== userId) {
              // Bonusları al
              const referralBonusInviter = Number.parseInt(getSetting('referral_bonus_inviter', '100'))
              const referralBonusInvited = Number.parseInt(getSetting('referral_bonus_invited', '50'))
              const dailyWheelSpins = Number.parseInt(getSetting('daily_wheel_spins', '3'))

              // Yeni kullanıcıyı oluştur (photoUrl yok - web'den giriş yaparken güncellenecek)
              const newUser = await prisma.user.create({
                data: {
                  telegramId: userId,
                  username,
                  firstName,
                  lastName,
                  referredById: referrer.id,
                  points: referralBonusInvited, // Davet edilene bonus
                  dailySpinsLeft: dailyWheelSpins,
                  hadStart: true // Kullanıcı /start yaptı
                }
              })

              // Davet eden kullanıcıya bonus ver
              await prisma.user.update({
                where: { id: referrer.id },
                data: {
                  totalReferrals: { increment: 1 },
                  referralPoints: { increment: referralBonusInviter },
                  points: { increment: referralBonusInviter }
                }
              })

              // Point history kayıtlarını oluştur
              await prisma.pointHistory.create({
                data: {
                  userId: newUser.id,
                  amount: referralBonusInvited,
                  type: 'referral_reward',
                  description: `${referrer.firstName || referrer.username || 'Bir kullanıcı'} tarafından davet edildin`
                }
              })

              await prisma.pointHistory.create({
                data: {
                  userId: referrer.id,
                  amount: referralBonusInviter,
                  type: 'referral_reward',
                  description: `${firstName || username || 'Bir kullanıcı'} senin davetinle katıldı`
                }
              })

              // Bonus mesajını gönder
              await sendTelegramMessage(chatId, `

🎁 **Referans Bonusu!**

${referrer.firstName || referrer.username || 'Bir kullanıcı'} seni davet etti!
+${referralBonusInvited} puan kazandın! 🎉
              `.trim())

              // Davet eden kişiye bildirim gönder
              if (referrer.telegramId) {
                await sendTelegramMessage(parseInt(referrer.telegramId), `
👥 **Yeni Davet!**

${firstName || username || 'Bir kullanıcı'} senin davetinle katıldı!
+${referralBonusInviter} puan kazandın! 🎉
                `.trim())
              }
            } else {
              // Referans kodu geçersiz, normal kayıt
              const dailyWheelSpins = Number.parseInt(getSetting('daily_wheel_spins', '3'))

              await prisma.user.create({
                data: {
                  telegramId: userId,
                  username,
                  firstName,
                  lastName,
                  dailySpinsLeft: dailyWheelSpins,
                  hadStart: true // Kullanıcı /start yaptı
                }
              })
            }
          } else if (!existingUser) {
            // Referans kodu yok, normal kayıt
            const dailyWheelSpins = Number.parseInt(getSetting('daily_wheel_spins', '3'))

            await prisma.user.create({
              data: {
                telegramId: userId,
                username,
                firstName,
                lastName,
                dailySpinsLeft: dailyWheelSpins,
                hadStart: true // Kullanıcı /start yaptı
              }
            })
          } else {
            // Mevcut kullanıcı, sadece temel bilgileri güncelle
            // photoUrl web'den giriş yaparken güncellenecek
            await prisma.user.update({
              where: { telegramId: userId },
              data: {
                username,
                firstName,
                lastName,
                hadStart: true // Kullanıcı /start yaptı
              }
            })
          }
        }

        return NextResponse.json({ ok: true })
      }

      // Ayarları al
      const minMessageLength = parseInt(getSetting('min_message_length', '3'))
      const messageCooldown = parseInt(getSetting('message_cooldown_seconds', '5'))
      const pointsPerMessage = parseInt(getSetting('points_per_message', '10'))
      const xpPerMessage = parseInt(getSetting('xp_per_message', '5'))
      const messagesForXp = parseInt(getSetting('messages_for_xp', '1'))
      const allowNewUsers = getSetting('allow_new_users', 'true') === 'true'

      // PUAN KAZANMA SADECE GRUPLARDA OLUR - Private chat'te puan verilmez
      if (chatType === 'private') {
        console.log(`💬 Private chat mesajı - puan verilmez`)
        return NextResponse.json({ ok: true, message: 'Private chat - no points' })
      }

      // Kullanıcıyı bul veya oluştur
      let user = await prisma.user.findUnique({
        where: { telegramId: userId }
      })

      // Kullanıcı yoksa oluştur (hadStart: false) - mesaj istatistiği için
      if (!user) {
        const dailyWheelSpins = Number.parseInt(getSetting('daily_wheel_spins', '3'))
        user = await prisma.user.create({
          data: {
            telegramId: userId,
            username,
            firstName,
            lastName,
            dailySpinsLeft: dailyWheelSpins,
            hadStart: false // Kullanıcı sadece gruba yazdı, /start yapmadı
          }
        })
        console.log(`✅ Yeni kullanıcı oluşturuldu (sadece mesaj için, hadStart: false): ${userId}`)
      }

      // hadStart yapmamışlara puan verilmez
      const canEarnPoints = user.hadStart

      // TÜM MESAJLARI İSTATİSTİK İÇİN KAYDET (KURALLARDAN BAĞIMSIZ)
      await prisma.messageStats.create({
        data: {
          userId: user.id,
          content: messageText.substring(0, 500),
          messageLength: messageText.length,
          earnedReward: false // Varsayılan olarak false, ödül verilirse güncellenecek
        }
      })

      // Puan kazanamayanlar için buradan çık
      if (!canEarnPoints) {
        console.log(`⚠️ Kullanıcı /start yapmamış - sadece mesaj kaydedildi, puan verilmedi (userId: ${userId})`)
        return NextResponse.json({ ok: true, message: 'Message saved, no points (hadStart required)' })
      }

      // Mesaj uzunluğu kontrolü (ÖDÜL İÇİN)
      if (messageText.length < minMessageLength) {
        return NextResponse.json({ ok: true, message: 'Message too short' })
      }

      // Spam kontrolü - Son mesajdan beri yeterli süre geçmiş mi? (ÖDÜL İÇİN)
      if (user.lastMessageAt) {
        const timeSinceLastMessage = (Date.now() - user.lastMessageAt.getTime()) / 1000
        if (timeSinceLastMessage < messageCooldown) {
          return NextResponse.json({ ok: true, message: 'Cooldown active' })
        }
      }

      // Mesaj sayacını artır
      const newMessageCount = user.messageCount + 1

      // XP verilecek mi kontrol et
      const shouldGiveXp = newMessageCount % messagesForXp === 0

      // Kullanıcıyı güncelle (ÖDÜL VER)
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          points: { increment: pointsPerMessage },
          xp: shouldGiveXp ? { increment: xpPerMessage } : undefined,
          messageCount: newMessageCount,
          totalMessages: { increment: 1 }, // Sadece ödül kazanan mesajlar
          lastMessageAt: getTurkeyDate() // Türkiye saati
        }
      })

      // Bu mesajın ödül kazandığını işaretle
      await prisma.messageStats.updateMany({
        where: {
          userId: user.id,
          createdAt: { gte: new Date(getTurkeyDate().getTime() - 2000) } // Son 2 saniyedeki mesaj (Türkiye saati)
        },
        data: {
          earnedReward: true
        }
      })

      // Rütbe kontrolü ve güncelleme (sadece XP verildiğinde)
      if (shouldGiveXp) {
        const currentRank = await prisma.rank.findFirst({
          where: { minXp: { lte: updatedUser.xp } },
          orderBy: { minXp: 'desc' }
        })

        if (currentRank && user.rankId !== currentRank.id) {
          await prisma.user.update({
            where: { id: user.id },
            data: { rankId: currentRank.id }
          })

          // Seviye atlama bildirimi - SADECE GRUPTA, MENTION İLE
          const notificationSent = await notifyLevelUp(
            userId,
            firstName || username || 'Kullanıcı',
            {
              icon: currentRank.icon,
              name: currentRank.name,
              xp: updatedUser.xp
            }
          )

          if (notificationSent) {
            console.log(`✅ Rütbe atlaması bildirimi gönderildi: ${userId} -> ${currentRank.name}`)
          } else {
            console.log(`⚠️ Rütbe atlaması bildirimi gönderilemedi: ${userId}`)
          }
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ ok: true })
  }
}
