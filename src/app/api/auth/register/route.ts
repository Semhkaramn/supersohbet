import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { createToken, createAuthResponse } from '@/lib/auth'

// Validation schema
const registerSchema = z.object({
  email: z.string().email('Geçerli bir email adresi giriniz'),
  siteUsername: z.string().min(3, 'Kullanıcı adı en az 3 karakter olmalıdır').max(20, 'Kullanıcı adı en fazla 20 karakter olabilir'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır'),
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
          details: validation.error.issues
        },
        { status: 400 }
      )
    }

    const { email, siteUsername, password, referralCode } = validation.data

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

    // SiteUsername kontrolü
    const existingSiteUsername = await prisma.user.findFirst({
      where: { siteUsername }
    })

    if (existingSiteUsername) {
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
    const userReferralCode = `${siteUsername.toLowerCase()}-${Math.random().toString(36).substring(2, 8)}`

    // Yeni kullanıcı oluştur
    const user = await prisma.user.create({
      data: {
        email,
        siteUsername,
        password: passwordHash,
        loginMethod: 'email',
        referralCode: userReferralCode,
        referredById
      },
      select: {
        id: true,
        email: true,
        siteUsername: true,
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
            description: `${siteUsername} referansınızla katıldı!`
          }
        })
      ])
    }

    // JWT token oluştur
    const token = await createToken({
      userId: user.id,
      email: user.email!,
      username: user.siteUsername!
    })

    console.log('✅ Yeni kullanıcı kaydedildi:', {
      email: user.email,
      siteUsername: user.siteUsername
    })

    return createAuthResponse({
      success: true,
      message: 'Kayıt başarılı!',
      user: {
        id: user.id,
        email: user.email,
        siteUsername: user.siteUsername,
        username: null,
        firstName: null,
        lastName: null,
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
