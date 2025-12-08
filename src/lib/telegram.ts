import TelegramBot from 'node-telegram-bot-api'
import { createHash, createHmac } from 'crypto'
import { prisma } from './prisma'

let bot: TelegramBot | null = null
let botToken: string | null = null

export async function getTelegramBot(): Promise<TelegramBot> {
  if (!bot || !botToken) {
    // Önce veritabanından token'ı al
    const tokenSetting = await prisma.settings.findUnique({
      where: { key: 'telegram_bot_token' }
    })

    const token = tokenSetting?.value || process.env.TELEGRAM_BOT_TOKEN

    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN bulunamadı! Admin panelinden ayarlayın.')
    }

    botToken = token
    bot = new TelegramBot(token, { polling: false })
  }
  return bot
}

// Menu button'u ayarla (mesaj yazma alanının yanındaki buton)
export async function setupMenuButton(webAppUrl: string): Promise<void> {
  try {
    const bot = await getTelegramBot()

    // Token'ı al
    const tokenSetting = await prisma.settings.findUnique({
      where: { key: 'telegram_bot_token' }
    })
    const token = tokenSetting?.value || process.env.TELEGRAM_BOT_TOKEN
    if (!token) return

    // Telegram Bot API'ye doğrudan istek gönder
    const url = `https://api.telegram.org/bot${token}/setChatMenuButton`
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        menu_button: {
          type: 'web_app',
          text: '🎁 Ödül Merkezi',
          web_app: { url: webAppUrl }
        }
      })
    })
    console.log('✅ Menu button configured!')
  } catch (error) {
    console.error('Error setting menu button:', error)
  }
}

// Kullanıcının kanala üye olup olmadığını kontrol et
export async function checkChannelMembership(
  userId: string,
  channelId: string
): Promise<boolean> {
  try {
    const bot = await getTelegramBot()

    // userId string olarak geldiği için number'a çeviriyoruz
    const numericUserId = Number.parseInt(userId, 10)
    if (Number.isNaN(numericUserId)) {
      console.error('❌ Invalid userId format:', userId)
      return false
    }

    // channelId formatını düzenle
    // Eğer sadece username ise (örn: "kanalkodileti"), @ ekle
    // Eğer zaten @ veya - ile başlıyorsa olduğu gibi bırak
    let chatId = channelId.trim()
    if (!chatId.startsWith('@') && !chatId.startsWith('-')) {
      chatId = '@' + chatId
    }

    console.log(`🔍 Kanal üyelik kontrolü: userId=${numericUserId}, chatId="${chatId}"`)

    const member = await bot.getChatMember(chatId, numericUserId)
    const isMember = ['creator', 'administrator', 'member'].includes(member.status)

    console.log(`✅ Üyelik sonucu: ${isMember ? 'ÜYE' : 'ÜYE DEĞİL'} (durum: ${member.status})`)

    return isMember
  } catch (error: unknown) {
    const err = error as { message?: string; code?: string; response?: { body?: unknown } };
    console.error('❌ Kanal üyelik kontrolü hatası:', err?.message || error)
    console.error('Detaylar:', {
      userId,
      channelId,
      errorCode: err?.code,
      errorResponse: err?.response?.body
    })

    // Eğer kanal bulunamazsa veya bot kanalda değilse
    if (err?.message?.includes('chat not found') || err?.code === 'ETELEGRAM') {
      console.error('⚠️ Bot bu kanala erişemiyor veya kanal bulunamadı!')
      console.error('⚠️ Çözüm: Bot\'u kanala ADMIN olarak ekleyin veya kanal ID\'sini kontrol edin')
      console.error('📋 Not: Bot admin olmadan kullanıcı üyeliklerini kontrol edemez!')
    }

    if (err?.message?.includes('not enough rights') || err?.message?.includes('Forbidden')) {
      console.error('❌ Bot\'un yetkileri yetersiz veya bot kanala eklenmemiş!')
      console.error('⚠️ Çözüm: Bot\'u kanalda ADMIN yapın ve "Add Members" yetkisi verin!')
    }

    return false
  }
}

// Telegram Login Widget doğrulama
export async function verifyTelegramAuth(data: Record<string, string>): Promise<boolean> {
  try {
    // Token'ı veritabanından al
    const tokenSetting = await prisma.settings.findUnique({
      where: { key: 'telegram_bot_token' }
    })
    const token = tokenSetting?.value || process.env.TELEGRAM_BOT_TOKEN || ''

    const secret = createHash('sha256')
      .update(token)
      .digest()

    const checkString = Object.keys(data)
      .filter(key => key !== 'hash')
      .sort()
      .map(key => `${key}=${data[key]}`)
      .join('\n')

    const hash = createHmac('sha256', secret)
      .update(checkString)
      .digest('hex')

    return hash === data.hash
  } catch (error) {
    console.error('Telegram auth verification error:', error)
    return false
  }
}
