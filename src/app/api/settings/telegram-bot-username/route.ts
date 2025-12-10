import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Bot username'i ayarlardan al
    const setting = await prisma.settings.findUnique({
      where: { key: 'telegram_bot_username' }
    })

    // Eğer ayarlarda yoksa env'den al
    const username = setting?.value || process.env.TELEGRAM_BOT_USERNAME || 'supersohbetbot'

    return NextResponse.json({
      username: username.replace('@', '') // @ işaretini kaldır
    })
  } catch (error) {
    console.error('Error fetching bot username:', error)
    return NextResponse.json(
      { username: 'supersohbetbot' }, // Fallback
      { status: 200 }
    )
  }
}
