import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request)

    // Kullanıcının Telegram bağlantı durumunu kontrol et
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        telegramId: true,
        hadStart: true,
        firstName: true,
        photoUrl: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Kullanıcı bulunamadı' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      connected: !!user.telegramId && user.hadStart,
      telegramId: user.telegramId,
      hadStart: user.hadStart,
      firstName: user.firstName,
      photoUrl: user.photoUrl
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Oturum geçersiz' },
        { status: 401 }
      )
    }

    console.error('Telegram status check error:', error)
    return NextResponse.json(
      { error: 'Bir hata oluştu' },
      { status: 500 }
    )
  }
}
