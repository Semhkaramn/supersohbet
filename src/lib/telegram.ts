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

// Kullanıcının profil fotoğrafını al
export async function getUserProfilePhoto(userId: number): Promise<string | null> {
  try {
    const tokenSetting = await prisma.settings.findUnique({
      where: { key: 'telegram_bot_token' }
    })
    const token = tokenSetting?.value || process.env.TELEGRAM_BOT_TOKEN
    if (!token) return null

    // Kullanıcının profil fotoğraflarını al
    const url = `https://api.telegram.org/bot${token}/getUserProfilePhotos`
    const response = await fetch(`${url}?user_id=${userId}&limit=1`)
    const data = await response.json()

    if (!data.ok || !data.result || !data.result.photos || data.result.photos.length === 0) {
      return null
    }

    // İlk fotoğrafın en büyük boyutunu al
    const photo = data.result.photos[0]
    const largestPhoto = photo[photo.length - 1]
    const fileId = largestPhoto.file_id

    // Dosya yolunu al
    const fileUrl = `https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`
    const fileResponse = await fetch(fileUrl)
    const fileData = await fileResponse.json()

    if (!fileData.ok || !fileData.result || !fileData.result.file_path) {
      return null
    }

    // Tam URL'yi oluştur
    const photoUrl = `https://api.telegram.org/file/bot${token}/${fileData.result.file_path}`
    return photoUrl
  } catch (error) {
    console.error('Error getting user profile photo:', error)
    return null
  }
}

// Telegram mesajı gönder
export async function sendTelegramMessage(chatId: number, message: string): Promise<void> {
  try {
    const bot = await getTelegramBot()
    await bot.sendMessage(chatId, message, { parse_mode: 'HTML' })
    console.log(`✅ Telegram mesajı gönderildi: ${chatId}`)
  } catch (error) {
    console.error('❌ Telegram mesajı gönderilemedi:', error)
    throw error
  }
}

// Grup adminlerini getir
export async function getGroupAdmins(chatId: string): Promise<Array<{ userId: number; firstName: string; lastName?: string; username?: string }>> {
  try {
    const tokenSetting = await prisma.settings.findUnique({
      where: { key: 'telegram_bot_token' }
    })
    const token = tokenSetting?.value || process.env.TELEGRAM_BOT_TOKEN
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN bulunamadı')
    }

    // Telegram Bot API'den grup adminlerini çek
    const url = `https://api.telegram.org/bot${token}/getChatAdministrators?chat_id=${chatId}`
    const response = await fetch(url)
    const data = await response.json()

    if (!data.ok) {
      throw new Error(data.description || 'Adminler alınamadı')
    }

    // Adminleri formatla
    const admins = data.result
      .filter((admin: any) => !admin.user.is_bot) // Bot olmayan adminleri filtrele
      .map((admin: any) => ({
        userId: admin.user.id,
        firstName: admin.user.first_name,
        lastName: admin.user.last_name,
        username: admin.user.username
      }))

    console.log(`✅ ${admins.length} admin bulundu`)
    return admins
  } catch (error) {
    console.error('❌ Grup adminleri alınamadı:', error)
    throw error
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
