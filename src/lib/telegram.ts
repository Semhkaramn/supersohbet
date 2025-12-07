import TelegramBot from 'node-telegram-bot-api'
import { createHash, createHmac } from 'crypto'

let bot: TelegramBot | null = null

export function getTelegramBot(): TelegramBot {
  if (!bot) {
    const token = process.env.TELEGRAM_BOT_TOKEN
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN is not defined')
    }
    bot = new TelegramBot(token, { polling: false })
  }
  return bot
}

// Menu button'u ayarla (mesaj yazma alanının yanındaki buton)
export async function setupMenuButton(webAppUrl: string): Promise<void> {
  try {
    const bot = getTelegramBot()
    const token = process.env.TELEGRAM_BOT_TOKEN
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
    const bot = getTelegramBot()

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
  } catch (error: any) {
    console.error('❌ Kanal üyelik kontrolü hatası:', error?.message || error)
    console.error('Detaylar:', {
      userId,
      channelId,
      errorCode: error?.code,
      errorResponse: error?.response?.body
    })

    // Eğer kanal bulunamazsa veya bot kanalda değilse
    if (error?.message?.includes('chat not found') || error?.code === 'ETELEGRAM') {
      console.error('⚠️ Bot bu kanala erişemiyor veya kanal bulunamadı!')
      console.error('⚠️ Çözüm: Bot\'u kanala admin olarak ekleyin veya kanal ID\'sini kontrol edin')
    }

    return false
  }
}

// Telegram Login Widget doğrulama
export function verifyTelegramAuth(data: Record<string, string>): boolean {
  const secret = createHash('sha256')
    .update(process.env.TELEGRAM_BOT_TOKEN || '')
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
}
