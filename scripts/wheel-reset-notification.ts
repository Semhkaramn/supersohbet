import { PrismaClient } from '@prisma/client'
import { sendTelegramMessage } from '../src/lib/telegram'

const prisma = new PrismaClient()

async function notifyWheelReset() {
  try {
    console.log('🔄 Çark hakkı yenilenme bildirimi başlıyor...')

    // Bildirim ayarını kontrol et
    const notifySetting = await prisma.settings.findUnique({
      where: { key: 'notify_wheel_reset' }
    })

    if (notifySetting?.value !== 'true') {
      console.log('⏭️ Bildirim ayarı kapalı, işlem atlanıyor')
      return
    }

    // Günlük çark hakkı sayısını al
    const dailySpinsSetting = await prisma.settings.findUnique({
      where: { key: 'daily_wheel_spins' }
    })
    const dailySpins = dailySpinsSetting?.value || '3'

    // Tüm aktif kullanıcıları al (banlı olmayanlar ve telegramId'si olanlar)
    const users = await prisma.user.findMany({
      where: {
        isBanned: false,
        telegramId: { not: null }
      },
      select: {
        telegramId: true,
        firstName: true,
        username: true
      }
    })

    console.log(`📊 ${users.length} kullanıcıya bildirim gönderilecek`)

    const message = `
🎡 **Şans Çarkı Hakkın Yenilendi!**

✨ Yeni günlük çark hakkın: **${dailySpins}**
🎁 Hemen çevir, muhteşem ödüller kazan!

Bot menüsünden "Şans Çarkı" seçeneğine tıklayarak şansını dene! 🍀
    `.trim()

    let successCount = 0
    let failCount = 0

    // Kullanıcılara batch halinde mesaj gönder (Telegram rate limit'ini aşmamak için)
    for (let i = 0; i < users.length; i++) {
      const user = users[i]

      if (user.telegramId) {
        console.log(`🔔 [WheelResetScript] Bildirim gönderiliyor: ${i + 1}/${users.length} - telegramId=${user.telegramId}`)
        const success = await sendTelegramMessage(user.telegramId, message)

        if (success) {
          successCount++
          console.log(`✅ [WheelResetScript] Gönderildi: ${user.firstName || user.username}`)
        } else {
          failCount++
          console.error(`❌ [WheelResetScript] Gönderilemedi: ${user.firstName || user.username} (telegramId: ${user.telegramId})`)
        }

        // Her 30 mesajda bir 1 saniye bekle (Telegram rate limit)
        if ((i + 1) % 30 === 0) {
          console.log(`⏳ ${i + 1}/${users.length} mesaj gönderildi, kısa mola...`)
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
    }

    console.log(`✅ Bildirim tamamlandı: ${successCount} başarılı, ${failCount} başarısız`)
  } catch (error) {
    console.error('❌ Çark hakkı yenilenme bildirimi hatası:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Script doğrudan çalıştırılırsa
if (require.main === module) {
  notifyWheelReset()
}

export { notifyWheelReset }
