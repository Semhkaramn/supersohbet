import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { createToken, createAuthResponse } from '@/lib/auth'

// Validation schema
const registerSchema = z.object({
  email: z.string().email('Geçerli bir email adresi giriniz'),
  username: z.string().min(3, 'Kullanıcı adı en az 3 karakter olmalıdır').max(20, 'Kullanıcı adı en fazla 20 karakter olabilir'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır'),
  firstName: z.string().min(2, 'İsim en az 2 karakter olmalıdır').optional(),
  referralCode: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validation = registerSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Geçersiz veri',
          details: validation.error.errors
        },
        { status: 400 }
      )
    }

    const { email, username, password, firstName, referralCode } = validation.data

    // Email kontrolü
    const existingEmail = await prisma.user.findUnique({
      where: { email }
    })

    if (existingEmail) {
      return NextResponse.json(
        { error: 'Bu email adresi zaten kullanılıyor' },
        { status: 400 }
      )
    }

    // Username kontrolü
    const existingUsername = await prisma.user.findFirst({
      where: { username }
    })

    if (existingUsername) {
      return NextResponse.json(
        { error: 'Bu kullanıcı adı zaten kullanılıyor' },
        { status: 400 }
      )
    }

    // Şifreyi hashle
    const passwordHash = await bcrypt.hash(password, 10)

    // Referral code kontrolü
    let referredById: string | undefined
    if (referralCode) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode }
      })
      if (referrer) {
        referredById = referrer.id
      }
    }

    // Kullanıcının kendi referral code'unu oluştur
    const userReferralCode = `${username.toLowerCase()}-${Math.random().toString(36).substring(2, 8)}`

    // Yeni kullanıcı oluştur
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: passwordHash,
        firstName: firstName || username,
        loginMethod: 'email',
        referralCode: userReferralCode,
        referredById
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        points: true,
        xp: true
      }
    })

    // Eğer referral code kullanıldıysa, referrer'a puan ver
    if (referredById) {
      await Promise.all([
        // Referrer'ın total referral sayısını artır
        prisma.user.update({
          where: { id: referredById },
          data: {
            totalReferrals: { increment: 1 },
            referralPoints: { increment: 100 }, // 100 puan ödül
            points: { increment: 100 }
          }
        }),
        // Point history ekle
        prisma.pointHistory.create({
          data: {
            userId: referredById,
            amount: 100,
            type: 'referral_reward',
            description: `${username} referansınızla katıldı!`
          }
        })
      ])
    }

    // JWT token oluştur
    const token = await createToken({
      userId: user.id,
      email: user.email!,
      username: user.username!
    })

    console.log('✅ Yeni kullanıcı kaydedildi:', {
      email: user.email,
      username: user.username
    })

    return createAuthResponse({
      success: true,
      message: 'Kayıt başarılı!',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        points: user.points,
        xp: user.xp,
        referralCode: userReferralCode,
        telegramId: null,
        hadStart: false
      }
    }, token)

  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json(
      { error: 'Kayıt işlemi sırasında bir hata oluştu' },
      { status: 500 }
    )
  }
}
