import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { getTurkeyDate } from '@/lib/utils'

// 6 haneli doğrulama kodu oluştur
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request)

    // Kullanıcıyı bul
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        email: true,
        emailVerified: true,
        emailVerificationTokenExpiry: true
      }
    })

    if (!user || !user.email) {
      return NextResponse.json(
        { error: 'Email adresi bulunamadı' },
        { status: 404 }
      )
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { error: 'Email adresi zaten doğrulanmış' },
        { status: 400 }
      )
    }

    // Rate limiting: Son kod gönderiminden 1 dakika geçmeli
    if (user.emailVerificationTokenExpiry) {
      const now = getTurkeyDate()
      const timeSinceLastSend = now.getTime() - user.emailVerificationTokenExpiry.getTime()
      const oneMinute = 60 * 1000

      if (timeSinceLastSend < oneMinute && user.emailVerificationTokenExpiry > now) {
        const waitSeconds = Math.ceil((oneMinute - timeSinceLastSend) / 1000)
        return NextResponse.json(
          { error: `Lütfen ${waitSeconds} saniye bekleyin` },
          { status: 429 }
        )
      }
    }

    // Doğrulama kodu oluştur
    const verificationCode = generateVerificationCode()
    const now = getTurkeyDate()
    const expiryDate = new Date(now.getTime() + 10 * 60 * 1000) // 10 dakika geçerli

    // Kodu veritabanına kaydet
    await prisma.user.update({
      where: { id: session.userId },
      data: {
        emailVerificationToken: verificationCode,
        emailVerificationTokenExpiry: expiryDate
      }
    })

    // TODO: Gerçek email gönderimi için mail servisi entegrasyonu yapılmalı
    // Şimdilik sadece konsola yazdırıyoruz
    console.log(`Verification code for ${user.email}: ${verificationCode}`)

    return NextResponse.json({
      success: true,
      message: 'Doğrulama kodu email adresinize gönderildi',
      // Development için kodu döndürelim (production'da kaldırılmalı)
      ...(process.env.NODE_ENV === 'development' && { code: verificationCode })
    })
  } catch (error) {
    console.error('Send verification email error:', error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Giriş yapmalısınız' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Bir hata oluştu' },
      { status: 500 }
    )
  }
}
