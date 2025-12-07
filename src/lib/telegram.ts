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
      console.error('Invalid userId format:', userId)
      return false
    }

    // channelId @ ile başlamıyorsa @ ekle (username için gerekli)
    let chatId = channelId
    if (!chatId.startsWith('@') && !chatId.startsWith('-')) {
      chatId = '@' + chatId
    }

    console.log(`Checking membership: userId=${numericUserId}, chatId=${chatId}`)

    const member = await bot.getChatMember(chatId, numericUserId)
    const isMember = ['creator', 'administrator', 'member'].includes(member.status)

    console.log(`Membership result: ${isMember} (status: ${member.status})`)

    return isMember
  } catch (error) {
    console.error('Channel membership check error:', error)
    console.error('Details:', { userId, channelId })
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
