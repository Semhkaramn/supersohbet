import { NextResponse } from 'next/server'
import { sendTelegramMessage } from '@/lib/telegram'

// POST - Randy kazananlarını admin'e gönder
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { adminTelegramId, message } = body

    if (!adminTelegramId || !message) {
      return NextResponse.json(
        { error: 'Admin Telegram ID ve mesaj gerekli' },
        { status: 400 }
      )
    }

    // Telegram mesajını gönder
    await sendTelegramMessage(Number.parseInt(adminTelegramId), message)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Randy kazananları gönderme hatası:', error)
    return NextResponse.json(
      { error: 'Mesaj gönderilemedi' },
      { status: 500 }
    )
  }
}
