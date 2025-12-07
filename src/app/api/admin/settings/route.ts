import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Tüm ayarları getir
export async function GET(request: NextRequest) {
  try {
    const settings = await prisma.settings.findMany({
      orderBy: [
        { category: 'asc' },
        { key: 'asc' }
      ]
    })

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Settings GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Ayarı güncelle
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { key, value } = body

    if (!key) {
      return NextResponse.json(
        { error: 'Key is required' },
        { status: 400 }
      )
    }

    const setting = await prisma.settings.update({
      where: { key },
      data: { value }
    })

    // Eğer telegram_bot_token güncellendiyse webhook'u kur
    if (key === 'telegram_bot_token' && value) {
      try {
        // Webhook URL'ini al
        const webhookUrlSetting = await prisma.settings.findUnique({
          where: { key: 'telegram_webhook_url' }
        })

        const webhookUrl = webhookUrlSetting?.value || `${process.env.NEXT_PUBLIC_APP_URL}/api/telegram/webhook`

        // Telegram'a webhook kur
        const telegramResponse = await fetch(`https://api.telegram.org/bot${value}/setWebhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: webhookUrl })
        })

        const telegramData = await telegramResponse.json()

        if (telegramData.ok) {
          console.log('✅ Webhook başarıyla kuruldu:', webhookUrl)

          // Bot bilgilerini al
          const botInfoResponse = await fetch(`https://api.telegram.org/bot${value}/getMe`)
          const botInfoData = await botInfoResponse.json()

          if (botInfoData.ok) {
            console.log('✅ Bot bağlantısı başarılı:', botInfoData.result.username)
            return NextResponse.json({
              success: true,
              setting,
              webhookSet: true,
              botUsername: botInfoData.result.username,
              message: `Bot başarıyla bağlandı! @${botInfoData.result.username}`
            })
          }
        } else {
          console.error('❌ Webhook kurulumu başarısız:', telegramData)
          return NextResponse.json({
            success: true,
            setting,
            webhookSet: false,
            error: telegramData.description,
            message: 'Ayar kaydedildi ama webhook kurulamadı: ' + telegramData.description
          })
        }
      } catch (webhookError) {
        console.error('Webhook error:', webhookError)
        return NextResponse.json({
          success: true,
          setting,
          webhookSet: false,
          message: 'Ayar kaydedildi ama webhook kurulamadı. Lütfen internet bağlantınızı kontrol edin.'
        })
      }
    }

    return NextResponse.json({ success: true, setting })
  } catch (error) {
    console.error('Settings PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
