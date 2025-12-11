import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request)

    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: session.userId }
    })

    if (!user || !user.telegramId) {
      return NextResponse.json(
        { error: 'Telegram hesabı bağlı değil' },
        { status: 400 }
      )
    }

    // Check if user can disconnect (hasn't disconnected in the last 24 hours)
    if (user.telegramUnlinkedAt) {
      const daysSinceUnlink = Math.floor(
        (Date.now() - new Date(user.telegramUnlinkedAt).getTime()) / (1000 * 60 * 60 * 24)
      )

      if (daysSinceUnlink < 1) {
        return NextResponse.json(
          { error: `${1 - daysSinceUnlink} gün sonra tekrar bağlantı koparabilirsiniz` },
          { status: 400 }
        )
      }
    }

    // Disconnect Telegram
    await prisma.user.update({
      where: { id: session.userId },
      data: {
        telegramId: null,
        username: null,
        firstName: null,
        lastName: null,
        photoUrl: null,
        telegramUnlinkedAt: new Date(),
        hadStart: false
      }
    })

    console.log('✅ Telegram bağlantısı koparıldı:', {
      userId: session.userId
    })

    return NextResponse.json({
      success: true,
      message: 'Telegram bağlantısı koparıldı. 1 gün sonra tekrar bağlayabilirsiniz.'
    })

  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Oturum geçersiz. Lütfen tekrar giriş yapın.' },
        { status: 401 }
      )
    }

    console.error('Telegram disconnect error:', error)
    return NextResponse.json(
      { error: 'Telegram bağlantısı koparılırken hata oluştu' },
      { status: 500 }
    )
  }
}
