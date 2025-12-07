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

// Kullanıcının kanala üye olup olmadığını kontrol et
export async function checkChannelMembership(
  userId: string,
  channelId: string
): Promise<boolean> {
  try {
    const bot = getTelegramBot()
    const member = await bot.getChatMember(channelId, userId)
    return ['creator', 'administrator', 'member'].includes(member.status)
  } catch (error) {
    console.error('Channel membership check error:', error)
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
