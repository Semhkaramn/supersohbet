import { NextRequest, NextResponse } from 'next/server'
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

export async function getAdminFromToken(token: string) {
  if (!token) return null

  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8')
    const [adminId] = decoded.split(':')

    const admin = await prisma.admin.findUnique({
      where: { id: adminId }
    })

    return admin
  } catch (error) {
    console.error('Token decode error:', error)
    return null
  }
}

export async function requireAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    return {
      admin: null,
      error: NextResponse.json(
        { error: 'Unauthorized - Token required' },
        { status: 401 }
      )
    }
  }

  const admin = await getAdminFromToken(token)

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
