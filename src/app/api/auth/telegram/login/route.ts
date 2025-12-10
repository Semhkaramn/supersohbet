import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createToken, createAuthResponse } from '@/lib/auth'
import { getUserProfilePhoto } from '@/lib/telegram'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { telegramUser } = body

    if (!telegramUser || !telegramUser.id) {
      return NextResponse.json(
        { error: 'Geçersiz Telegram kullanıcı verisi' },
        { status: 400 }
      )
    }

    const telegramId = String(telegramUser.id)

    // Telegram ID ile kullanıcıyı bul
    let user = await prisma.user.findUnique({
      where: { telegramId },
      include: {
        rank: true
      }
    })

    if (!user) {
      // Kullanıcı bulunamadı, normal kayıt yapması gerekiyor
      return NextResponse.json(
        {
          error: 'Telegram hesabınız bağlı değil',
          needsRegistration: true,
          telegramUser: {
            id: telegramUser.id,
            username: telegramUser.username,
            firstName: telegramUser.first_name,
            lastName: telegramUser.last_name,
            photoUrl: telegramUser.photo_url
          }
        },
        { status: 404 }
      )
    }

    // Ban kontrolü
    if (user.isBanned) {
      return NextResponse.json({
        error: 'Hesabınız yasaklanmış',
        banned: true,
        banReason: user.banReason || 'Sistem kurallarını ihlal ettiniz.',
        bannedAt: user.bannedAt,
        bannedBy: user.bannedBy
      }, { status: 403 })
    }

    // Profil bilgilerini güncelle
    try {
      const photoUrl = await getUserProfilePhoto(telegramUser.id)
      if (photoUrl) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            photoUrl,
            username: telegramUser.username || user.username,
            firstName: telegramUser.first_name || user.firstName,
            lastName: telegramUser.last_name || user.lastName,
          }
        })
        user.photoUrl = photoUrl
      }
    } catch (photoError) {
      console.error('Profile photo update error:', photoError)
      // Fotoğraf güncellenemezse devam et
    }

    // JWT token oluştur
    const token = await createToken({
      userId: user.id,
      email: user.email!,
      username: user.username!
    })

    console.log('✅ Telegram WebApp otomatik girişi:', {
      userId: user.id,
      telegramId: user.telegramId,
      username: user.username
    })

    return createAuthResponse({
      success: true,
      message: 'Telegram ile giriş başarılı!',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        photoUrl: user.photoUrl,
        points: user.points,
        xp: user.xp,
        rank: user.rank,
        referralCode: user.referralCode,
        totalReferrals: user.totalReferrals
      }
    }, token)

  } catch (error) {
    console.error('Telegram login error:', error)
    return NextResponse.json(
      { error: 'Telegram girişi sırasında bir hata oluştu' },
      { status: 500 }
    )
  }
}
