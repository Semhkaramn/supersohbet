import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { createToken, createAuthResponse } from '@/lib/auth'

// Validation schema
const loginSchema = z.object({
  emailOrUsername: z.string().min(1, 'Email veya kullanıcı adı gereklidir'),
  password: z.string().min(1, 'Şifre gereklidir')
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validation = loginSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Geçersiz veri',
          details: validation.error.issues
        },
        { status: 400 }
      )
    }

    const { emailOrUsername, password } = validation.data

    // Kullanıcıyı bul (email veya siteUsername ile)
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: emailOrUsername },
          { siteUsername: emailOrUsername }
        ],
        loginMethod: 'email' // Sadece email ile kayıtlı kullanıcılar
      },
      include: {
        rank: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Kullanıcı bulunamadı' },
        { status: 401 }
      )
    }

    // Şifre kontrolü
    if (!user.password) {
      return NextResponse.json(
        { error: 'Bu hesap Telegram ile kaydedilmiş' },
        { status: 401 }
      )
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Hatalı şifre' },
        { status: 401 }
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

    // JWT token oluştur
    const token = await createToken({
      userId: user.id,
      email: user.email!,
      username: user.siteUsername!
    })

    console.log('✅ Kullanıcı giriş yaptı:', {
      email: user.email,
      siteUsername: user.siteUsername
    })

    return createAuthResponse({
      success: true,
      message: 'Giriş başarılı!',
      user: {
        id: user.id,
        email: user.email,
        siteUsername: user.siteUsername,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        photoUrl: user.photoUrl,
        points: user.points,
        xp: user.xp,
        rank: user.rank,
        referralCode: user.referralCode,
        totalReferrals: user.totalReferrals,
        telegramId: user.telegramId,
        hadStart: user.hadStart
      }
    }, token)

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Giriş işlemi sırasında bir hata oluştu' },
      { status: 500 }
    )
  }
}
