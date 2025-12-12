import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, createToken, createAuthResponse } from '@/lib/auth'
import { getUserProfilePhoto } from '@/lib/telegram'

export async function POST(request: NextRequest) {
  try {
    // Kullanıcı giriş yapmış olmalı
    const session = await requireAuth(request)

    const body = await request.json()
    const { telegramUser } = body

    if (!telegramUser || !telegramUser.id) {
      return NextResponse.json(
        { error: 'Geçersiz Telegram kullanıcı verisi' },
        { status: 400 }
      )
    }

    const telegramId = String(telegramUser.id)

    // Bu Telegram ID başka bir hesaba bağlı mı kontrol et
    const existingTelegramUser = await prisma.user.findUnique({
      where: { telegramId }
    })

    if (existingTelegramUser) {
      if (existingTelegramUser.id === session.userId) {
        return NextResponse.json(
          { error: 'Bu Telegram hesabı zaten bağlı' },
          { status: 400 }
        )
      } else {
        return NextResponse.json(
          { error: 'Bu Telegram hesabı başka bir kullanıcıya bağlı' },
          { status: 400 }
        )
      }
    }

    // Profil fotoğrafını çek
    let photoUrl: string | null = null
    try {
      photoUrl = await getUserProfilePhoto(telegramUser.id)
    } catch (error) {
      console.error('Profile photo error:', error)
      // Fotoğraf çekilemezse devam et
    }

    // Telegram hesabını mevcut kullanıcıya bağla
    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: {
        telegramId,
        username: telegramUser.username || undefined, // Telegram username
        firstName: telegramUser.first_name || undefined, // Telegram'dan
        lastName: telegramUser.last_name || undefined, // Telegram'dan
        photoUrl: photoUrl || undefined
      },
      include: {
        rank: true
      }
    })

    console.log('✅ Telegram hesabı bağlandı:', {
      userId: session.userId,
      telegramId,
      username: telegramUser.username
    })

    return NextResponse.json({
      success: true,
      message: 'Telegram hesabınız başarıyla bağlandı!',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        siteUsername: updatedUser.siteUsername,
        username: updatedUser.username, // Telegram username
        firstName: updatedUser.firstName, // Telegram'dan
        lastName: updatedUser.lastName, // Telegram'dan
        photoUrl: updatedUser.photoUrl,
        telegramId: updatedUser.telegramId
      }
    })

  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Oturum geçersiz. Lütfen tekrar giriş yapın.' },
        { status: 401 }
      )
    }

    console.error('Telegram link error:', error)
    return NextResponse.json(
      { error: 'Telegram hesabı bağlanırken hata oluştu' },
      { status: 500 }
    )
  }
}
