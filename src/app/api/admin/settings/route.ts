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

// POST - Grup username'inden chat ID'yi al
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { chatUsername } = body

    if (!chatUsername) {
      return NextResponse.json(
        { error: 'Chat username is required' },
        { status: 400 }
      )
    }

    // Bot token'ı al
    const botTokenSetting = await prisma.settings.findUnique({
      where: { key: 'telegram_bot_token' }
    })

    if (!botTokenSetting?.value) {
      return NextResponse.json(
        { error: 'Bot token not configured' },
        { status: 400 }
      )
    }

    // Username'i temizle (@ işaretini kaldır)
    const cleanUsername = chatUsername.replace('@', '').trim()

    // Telegram API'den chat bilgisini al
    try {
      const telegramResponse = await fetch(
        `https://api.telegram.org/bot${botTokenSetting.value}/getChat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: `@${cleanUsername}` })
        }
      )

      const telegramData = await telegramResponse.json()

      if (telegramData.ok && telegramData.result) {
        const chatId = String(telegramData.result.id)
        const chatTitle = telegramData.result.title
        const chatType = telegramData.result.type

        console.log(`✅ Chat ID bulundu: ${chatTitle} (${chatId})`)

        return NextResponse.json({
          success: true,
          chatId,
          chatTitle,
          chatType
        })
      } else {
        console.error('❌ Telegram API hatası:', telegramData)
        return NextResponse.json(
          {
            error: 'Grup bulunamadı. Botun grupta olduğundan ve admin olduğundan emin olun.',
            telegramError: telegramData.description
          },
          { status: 400 }
        )
      }
    } catch (telegramError) {
      console.error('Telegram API error:', telegramError)
      return NextResponse.json(
        { error: 'Telegram API bağlantı hatası' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Settings POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Ayarı güncelle veya oluştur (upsert)
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

    const setting = await prisma.settings.upsert({
      where: { key },
      update: { value },
      create: {
        key,
        value,
        description: key === 'activity_group_id' ? 'Mesaj dinleme ve puan verme yapılacak grup ID' : '',
        category: 'general'
      }
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

            // Bot username'i otomatik olarak kaydet
            await prisma.settings.upsert({
              where: { key: 'telegram_bot_username' },
              update: { value: botInfoData.result.username },
              create: {
                key: 'telegram_bot_username',
                value: botInfoData.result.username,
                description: 'Telegram Bot Kullanıcı Adı (@username)',
                category: 'telegram'
              }
            })

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
