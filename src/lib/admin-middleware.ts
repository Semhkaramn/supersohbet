import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify, SignJWT } from 'jose'
import { serialize } from 'cookie'
import { prisma } from './prisma'

export interface AdminPermissions {
  canAccessBroadcast: boolean
  canAccessStatistics: boolean
  canAccessTasks: boolean
  canAccessShop: boolean
  canAccessWheel: boolean
  canAccessSponsors: boolean
  canAccessRanks: boolean
  canAccessRandy: boolean
  canAccessSettings: boolean
  canAccessAdmins: boolean
  isSuperAdmin: boolean
}

export interface AdminSession {
  adminId: string
  username: string
  isSuperAdmin: boolean
}

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-key-min-32-characters-long-change-this-in-production'
)

/**
 * Admin için JWT token oluşturur
 */
export async function createAdminToken(payload: AdminSession): Promise<string> {
  const token = await new SignJWT({
    adminId: payload.adminId,
    username: payload.username,
    isSuperAdmin: payload.isSuperAdmin
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d') // 7 gün
    .sign(JWT_SECRET)

  return token
}

/**
 * Admin JWT token'ı doğrular
 */
export async function verifyAdminToken(token: string): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return {
      adminId: payload.adminId as string,
      username: payload.username as string,
      isSuperAdmin: payload.isSuperAdmin as boolean
    }
  } catch (error) {
    return null
  }
}

/**
 * Request'ten admin session bilgisini alır
 */
export async function getAdminSession(request: NextRequest): Promise<AdminSession | null> {
  try {
    const token = request.cookies.get('admin_auth_token')?.value
    if (!token) return null

    return await verifyAdminToken(token)
  } catch (error) {
    return null
  }
}

/**
 * Admin auth cookie'sini set eder
 */
export function setAdminAuthCookie(token: string): string {
  return serialize('admin_auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 gün
    path: '/'
  })
}

/**
 * Admin auth cookie'sini siler
 */
export function clearAdminAuthCookie(): string {
  return serialize('admin_auth_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/'
  })
}

/**
 * Token'dan admin bilgisini alır (eski fonksiyon - geriye uyumluluk için)
 */
export async function getAdminFromToken(token: string) {
  const session = await verifyAdminToken(token)
  if (!session) return null

  const admin = await prisma.admin.findUnique({
    where: { id: session.adminId }
  })

  return admin
}

export async function requireAdmin(request: NextRequest) {
  const session = await getAdminSession(request)

  if (!session) {
    return {
      admin: null,
      error: NextResponse.json(
        { error: 'Unauthorized - Token required' },
        { status: 401 }
      )
    }
  }

  const admin = await prisma.admin.findUnique({
    where: { id: session.adminId }
  })

  if (!admin) {
    return {
      admin: null,
      error: NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      )
    }
  }

  return { admin, error: null }
}

export async function requirePermission(
  request: NextRequest,
  permission: keyof AdminPermissions
) {
  const authResult = await requireAdmin(request)

  if (authResult.error) {
    return authResult
  }

  const admin = authResult.admin!

  // Super admin her şeye erişebilir
  if (admin.isSuperAdmin) {
    return { admin, error: null }
  }

  // Belirtilen yetkiyi kontrol et
  if (!admin[permission]) {
    return {
      admin: null,
      error: NextResponse.json(
        { error: 'Forbidden - Insufficient permissions' },
        { status: 403 }
      )
    }
  }

  return { admin, error: null }
}
