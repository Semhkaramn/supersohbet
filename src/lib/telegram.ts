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

/**
 * Telegram mesaj gönderme fonksiyonu - TÜM UYGULAMA İÇİN ORTAK
 * Bu fonksiyon AWAIT EDİLMELİDİR!
 * @param chatId - Telegram chat ID (string veya number)
 * @param text - Gönderilecek mesaj
 * @param parseMode - Parse modu (varsayılan: Markdown)
 * @param replyMarkup - Klavye veya inline keyboard (opsiyonel)
 * @returns Başarılı ise true, değilse false
 */
export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  parseMode: 'Markdown' | 'HTML' = 'Markdown',
  replyMarkup?: any
): Promise<boolean> {
  try {
    // Bot token'ı al
    const botTokenSetting = await prisma.settings.findUnique({
      where: { key: 'telegram_bot_token' }
    })

    if (!botTokenSetting?.value) {
      console.error('❌ [Telegram] Bot token bulunamadı!')
      return false
    }

    const url = `https://api.telegram.org/bot${botTokenSetting.value}/sendMessage`

    const requestBody: any = {
      chat_id: chatId,
      text,
      parse_mode: parseMode
    }

    if (replyMarkup) {
      requestBody.reply_markup = replyMarkup
    }

    console.log(`📤 [Telegram] Mesaj gönderiliyor: chatId=${chatId}, uzunluk=${text.length}`)

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    })

    const data = await response.json()

    if (data.ok) {
      console.log(`✅ [Telegram] Mesaj başarıyla gönderildi: chatId=${chatId}`)
      return true
    } else {
      console.error(`❌ [Telegram] Mesaj gönderilemedi: chatId=${chatId}`, {
        error_code: data.error_code,
        description: data.description
      })
      return false
    }
  } catch (error: any) {
    console.error(`❌ [Telegram] Mesaj gönderim hatası: chatId=${chatId}`, {
      error: error?.message || error,
      stack: error?.stack
    })
    return false
  }
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
      console.error('⚠️ Çözüm: Bot\'u kanala ADMIN olarak ekleyin veya kanal ID\'sini kontrol edin')
      console.error('📋 Not: Bot admin olmadan kullanıcı üyeliklerini kontrol edemez!')
    }

    if (error?.message?.includes('not enough rights') || error?.message?.includes('Forbidden')) {
      console.error('❌ Bot\'un yetkileri yetersiz veya bot kanala eklenmemiş!')
      console.error('⚠️ Çözüm: Bot\'u kanalda ADMIN yapın ve "Add Members" yetkisi verin!')
    }

    return false
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
