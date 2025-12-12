import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request)
    const body = await request.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Mevcut şifre ve yeni şifre gerekli' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Yeni şifre en az 6 karakter olmalıdır' },
        { status: 400 }
      )
    }

    // Kullanıcıyı bul
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { password: true, loginMethod: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Kullanıcı bulunamadı' },
        { status: 404 }
      )
    }

    // Email ile giriş yapmış kullanıcı mı kontrol et
    if (user.loginMethod !== 'email' || !user.password) {
      return NextResponse.json(
        { error: 'Bu işlem sadece email ile kayıt olan kullanıcılar için geçerlidir' },
        { status: 400 }
      )
    }

    // Mevcut şifreyi kontrol et
    const isValidPassword = await bcrypt.compare(currentPassword, user.password)

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Mevcut şifre yanlış' },
        { status: 401 }
      )
    }

    // Yeni şifreyi hashle ve güncelle
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    await prisma.user.update({
      where: { id: session.userId },
      data: { password: hashedPassword }
    })

    return NextResponse.json({
      success: true,
      message: 'Şifre başarıyla değiştirildi'
    })
  } catch (error) {
    console.error('Change password error:', error)

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
