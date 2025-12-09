import { prisma } from './prisma'

// Telegram mesaj gönderme fonksiyonu - BOT TOKEN VERİTABANINDAN ALINIR
async function getBotToken(): Promise<string | null> {
  try {
    const botTokenSetting = await prisma.settings.findUnique({
      where: { key: 'telegram_bot_token' }
    })
    return botTokenSetting?.value || null
  } catch (error) {
    console.error('Error getting bot token:', error)
    return null
  }
}

// Kullanıcıya özel mesaj gönder
export async function sendUserNotification(telegramId: string, text: string): Promise<boolean> {
  try {
    const botToken = await getBotToken()
    if (!botToken) {
      console.error('Bot token not configured')
      return false
    }

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramId,
        text,
        parse_mode: 'Markdown'
      })
    })

    const data = await response.json()
    if (!data.ok) {
      console.error(`Failed to send notification to ${telegramId}:`, data.description)
      return false
    }

    return true
  } catch (error) {
    console.error('Error sending user notification:', error)
    return false
  }
}

// Gruba mesaj gönder (mention ile)
export async function sendGroupNotification(
  groupId: string,
  text: string,
  mentionUserId?: string,
  mentionName?: string
): Promise<boolean> {
  try {
    const botToken = await getBotToken()
    if (!botToken) {
      console.error('Bot token not configured')
      return false
    }

    // Mention ekle
    let messageText = text
    if (mentionUserId && mentionName) {
      messageText = `[${mentionName}](tg://user?id=${mentionUserId})\n\n${text}`
    }

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: groupId,
        text: messageText,
        parse_mode: 'Markdown'
      })
    })

    const data = await response.json()
    if (!data.ok) {
      console.error(`Failed to send group notification to ${groupId}:`, data.description)
      return false
    }

    return true
  } catch (error) {
    console.error('Error sending group notification:', error)
    return false
  }
}

// Sipariş durumu değişikliği bildirimi
export async function notifyOrderStatusChange(
  userId: string,
  telegramId: string,
  orderDetails: {
    itemName: string
    pointsSpent: number
    status: string
    deliveryInfo?: string
  }
): Promise<boolean> {
  // Bildirim ayarını kontrol et
  const notifySetting = await prisma.settings.findUnique({
    where: { key: 'notify_order_approved' }
  })

  if (notifySetting?.value !== 'true') {
    console.log('Order notifications are disabled')
    return false
  }

  let message = ''

  // Duruma göre mesaj oluştur
  switch (orderDetails.status) {
    case 'completed':
      message = `
🎉 **Siparişiniz Tamamlandı!**

✅ Ürün: ${orderDetails.itemName}
💰 Fiyat: ${orderDetails.pointsSpent.toLocaleString()} puan

${orderDetails.deliveryInfo ? `📝 Teslimat Bilgisi:\n${orderDetails.deliveryInfo}\n\n` : ''}Siparişiniz onaylandı ve teslim edildi!
      `.trim()
      break

    case 'processing':
      message = `
⏳ **Siparişiniz İşleme Alındı**

📦 Ürün: ${orderDetails.itemName}
💰 Fiyat: ${orderDetails.pointsSpent.toLocaleString()} puan

${orderDetails.deliveryInfo ? `📝 Not:\n${orderDetails.deliveryInfo}\n\n` : ''}Siparişiniz hazırlanıyor. Lütfen bekleyiniz...
      `.trim()
      break

    case 'cancelled':
      message = `
❌ **Siparişiniz İptal Edildi**

📦 Ürün: ${orderDetails.itemName}
💰 İade Edilen Puan: ${orderDetails.pointsSpent.toLocaleString()}

${orderDetails.deliveryInfo ? `📝 İptal Nedeni:\n${orderDetails.deliveryInfo}\n\n` : ''}Puanlarınız hesabınıza iade edildi.
      `.trim()
      break

    case 'pending':
      message = `
🔔 **Sipariş Durumu Güncellendi**

📦 Ürün: ${orderDetails.itemName}
💰 Fiyat: ${orderDetails.pointsSpent.toLocaleString()} puan

Siparişiniz beklemede. En kısa sürede işleme alınacak.
      `.trim()
      break

    default:
      message = `
🔔 **Sipariş Durumu: ${orderDetails.status}**

📦 Ürün: ${orderDetails.itemName}
💰 Fiyat: ${orderDetails.pointsSpent.toLocaleString()} puan

${orderDetails.deliveryInfo ? `📝 Not:\n${orderDetails.deliveryInfo}` : ''}
      `.trim()
  }

  // Mesajı hemen gönder
  return await sendUserNotification(telegramId, message)
}

// Rütbe atlaması bildirimi (SADECE GRUPTA, MENTION İLE)
export async function notifyLevelUp(
  telegramId: string,
  userName: string,
  rankDetails: {
    icon: string
    name: string
    xp: number
  }
): Promise<boolean> {
  // Bildirim ayarını kontrol et
  const notifySetting = await prisma.settings.findUnique({
    where: { key: 'notify_level_up' }
  })

  if (notifySetting?.value !== 'true') {
    console.log('Level up notifications are disabled')
    return false
  }

  // Aktif grup ID'sini al
  const activityGroupSetting = await prisma.settings.findUnique({
    where: { key: 'activity_group_id' }
  })

  const activityGroupId = activityGroupSetting?.value
  if (!activityGroupId) {
    console.log('Activity group not configured')
    return false
  }

  const message = `🎊 Tebrikler! ${rankDetails.icon} **${rankDetails.name}** rütbesine yükseldin! (${rankDetails.xp.toLocaleString()} XP) 🚀`

  // Grupta mention ile bildirim gönder
  return await sendGroupNotification(
    activityGroupId,
    message,
    telegramId,
    userName
  )
}

// Çark sıfırlanması bildirimi
export async function notifyWheelReset(
  telegramId: string,
  dailySpins: number
): Promise<boolean> {
  const message = `
🎡 **Şans Çarkı Hakkın Yenilendi!**

✨ Yeni günlük çark hakkın: **${dailySpins}**
🎁 Hemen çevir, puanlarını kazan!
  `.trim()

  return await sendUserNotification(telegramId, message)
}

// Toplu bildirim gönder (rate limit ile)
export async function sendBulkNotifications(
  notifications: Array<{ telegramId: string; message: string }>,
  delayMs: number = 35
): Promise<{ success: number; failed: number }> {
  let successCount = 0
  let failCount = 0

  for (let i = 0; i < notifications.length; i++) {
    const { telegramId, message } = notifications[i]
    const success = await sendUserNotification(telegramId, message)

    if (success) {
      successCount++
    } else {
      failCount++
    }

    // Rate limit koruma - Her 30 mesajda bir 1 saniye bekle
    if ((i + 1) % 30 === 0) {
      console.log(`⏳ ${i + 1}/${notifications.length} mesaj gönderildi, kısa mola...`)
      await new Promise(resolve => setTimeout(resolve, 1000))
    } else if (i < notifications.length - 1) {
      // Normal delay
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  return { success: successCount, failed: failCount }
}
