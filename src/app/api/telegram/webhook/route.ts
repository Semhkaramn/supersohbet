import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

        const welcomeMessage = `
🎉 **SüperSohbet Bot'a Hoş Geldin!**

Merhaba ${firstName}!

Bu bot ile:
✨ Mesaj göndererek puan kazan
🏆 Rütbe atla
🎁 Günlük şans çarkını çevir
🛍️ Puanlarınla ödüller satın al
💰 Sponsor olarak platformu destekle

Başlamak için aşağıdaki butona tıkla!
        `.trim()

        const keyboard = {
          inline_keyboard: [
            [
              {
                text: '🎁 Ödül Merkezi',
                web_app: { url: webAppUrl }
              }
            ],
            [
              {
                text: '📊 İstatistiklerim',
                callback_data: 'my_stats'
              }
            ]
          ]
        }

        await sendTelegramMessage(chatId, welcomeMessage, keyboard)

        // Kullanıcıyı kaydet
        const allowNewUsers = getSetting('allow_new_users', 'true') === 'true'
        if (allowNewUsers) {
          await prisma.user.upsert({
            where: { telegramId: userId },
            update: {
              username,
              firstName,
              lastName
            },
            create: {
              telegramId: userId,
              username,
              firstName,
              lastName
            }
          })
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

      // Mesaj uzunluğu kontrolü
      if (messageText.length < minMessageLength) {
        return NextResponse.json({ ok: true, message: 'Message too short' })
      }

      // Kullanıcıyı bul veya oluştur
      let user = await prisma.user.findUnique({
        where: { telegramId: userId }
      })

      if (!user) {
        if (!allowNewUsers) {
          return NextResponse.json({ ok: true, message: 'New users not allowed' })
        }

        user = await prisma.user.create({
          data: {
            telegramId: userId,
            username,
            firstName,
            lastName
          }
        })
      }

      // Spam kontrolü - Son mesajdan beri yeterli süre geçmiş mi?
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

      // Kullanıcıyı güncelle
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          points: { increment: pointsPerMessage },
          xp: shouldGiveXp ? { increment: xpPerMessage } : undefined,
          messageCount: newMessageCount,
          totalMessages: { increment: 1 },
          lastMessageAt: new Date()
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
