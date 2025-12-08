import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserProfilePhoto } from '@/lib/telegram'

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

// Profil fotoğrafını al (helper)
async function getPhotoUrl(userId: string): Promise<string | null> {
  try {
    const numericUserId = Number.parseInt(userId, 10)
    if (Number.isNaN(numericUserId)) return null
    return await getUserProfilePhoto(numericUserId)
  } catch (error) {
    console.error('Error fetching photo:', error)
    return null
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

          // Profil fotoğrafını çek
          const photoUrl = await getPhotoUrl(userId)

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
              const referralBonusInviter = parseInt(getSetting('referral_bonus_inviter', '100'))
              const referralBonusInvited = parseInt(getSetting('referral_bonus_invited', '50'))

              // Yeni kullanıcıyı oluştur
              const newUser = await prisma.user.create({
                data: {
                  telegramId: userId,
                  username,
                  firstName,
                  lastName,
                  photoUrl,
                  referredById: referrer.id,
                  points: referralBonusInvited // Davet edilene bonus
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

              // Milestone kontrolü yap
              try {
                const { checkAndRewardMilestones } = await import('@/lib/referral')
                const completedMilestones = await checkAndRewardMilestones(referrer.id, referrer.telegramId)

                // Eğer milestone tamamlandıysa davet edene bildir
                if (completedMilestones && completedMilestones.length > 0) {
                  for (const milestone of completedMilestones) {
                    await sendTelegramMessage(parseInt(referrer.telegramId), `
🎉 **Milestone Tamamlandı!**

${milestone.name} hedefini başardın!
+${milestone.rewardPoints} puan kazandın! 🏆
                    `.trim())
                  }
                }
              } catch (err) {
                console.error('Milestone check error:', err)
              }

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
              await prisma.user.create({
                data: {
                  telegramId: userId,
                  username,
                  firstName,
                  lastName,
                  photoUrl
                }
              })
            }
          } else if (!existingUser) {
            // Referans kodu yok, normal kayıt
            await prisma.user.create({
              data: {
                telegramId: userId,
                username,
                firstName,
                lastName,
                photoUrl
              }
            })
          } else {
            // Mevcut kullanıcı, sadece güncelle
            await prisma.user.update({
              where: { telegramId: userId },
              data: {
                username,
                firstName,
                lastName,
                photoUrl
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

      // Kullanıcıyı bul veya oluştur
      let user = await prisma.user.findUnique({
        where: { telegramId: userId }
      })

      if (!user) {
        if (!allowNewUsers) {
          return NextResponse.json({ ok: true, message: 'New users not allowed' })
        }

        const photoUrl = await getPhotoUrl(userId)
        user = await prisma.user.create({
          data: {
            telegramId: userId,
            username,
            firstName,
            lastName,
            photoUrl
          }
        })
      }

      // TÜM MESAJLARI İSTATİSTİK İÇİN KAYDET (KURALLARDAN BAĞIMSIZ)
      await prisma.messageStats.create({
        data: {
          userId: user.id,
          content: messageText.substring(0, 500),
          messageLength: messageText.length,
          earnedReward: false // Varsayılan olarak false, ödül verilirse güncellenecek
        }
      })

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
          lastMessageAt: new Date()
        }
      })

      // Bu mesajın ödül kazandığını işaretle
      await prisma.messageStats.updateMany({
        where: {
          userId: user.id,
          createdAt: { gte: new Date(Date.now() - 2000) } // Son 2 saniyedeki mesaj
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
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
