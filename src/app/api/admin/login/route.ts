import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password required' },
        { status: 400 }
      )
    }

    // Admin kullanıcısını bul
    const admin = await prisma.admin.findUnique({
      where: { username }
    })

    if (!admin) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Şifreyi kontrol et
    const isValidPassword = await bcrypt.compare(password, admin.passwordHash)

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Basit token oluştur (production'da JWT kullanın)
    const token = Buffer.from(`${admin.id}:${Date.now()}`).toString('base64')

    return NextResponse.json({
      success: true,
      token,
      adminId: admin.id,
      username: admin.username,
      isSuperAdmin: admin.isSuperAdmin
    })
  } catch (error) {
    console.error('Admin login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
