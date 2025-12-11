import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { createAdminToken, setAdminAuthCookie } from '@/lib/admin-middleware'

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

    // JWT token oluştur
    const token = await createAdminToken({
      adminId: admin.id,
      username: admin.username,
      isSuperAdmin: admin.isSuperAdmin
    })

    // Response oluştur ve cookie set et
    const response = NextResponse.json({
      success: true,
      adminId: admin.id,
      username: admin.username,
      isSuperAdmin: admin.isSuperAdmin
    })

    response.headers.append('Set-Cookie', setAdminAuthCookie(token))

    return response
  } catch (error) {
    console.error('Admin login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
