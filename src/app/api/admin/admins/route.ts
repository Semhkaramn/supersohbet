import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { requirePermission } from '@/lib/admin-middleware'

// GET - Tüm adminleri listele
export async function GET(request: NextRequest) {
  const authCheck = await requirePermission(request, 'canAccessAdmins')
  if (authCheck.error) return authCheck.error

  try {
    const admins = await prisma.admin.findMany({
      select: {
        id: true,
        username: true,
        isSuperAdmin: true,
        canAccessDashboard: true,
        canAccessBroadcast: true,
        canAccessStatistics: true,
        canAccessTasks: true,
        canAccessShop: true,
        canAccessWheel: true,
        canAccessSponsors: true,
        canAccessRanks: true,
        canAccessSettings: true,
        canAccessChannels: true,
        canAccessUsers: true,
        canAccessAdmins: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [
        { isSuperAdmin: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json(admins)
  } catch (error) {
    console.error('Error fetching admins:', error)
    return NextResponse.json(
      { error: 'Failed to fetch admins' },
      { status: 500 }
    )
  }
}

// POST - Yeni admin oluştur
export async function POST(request: NextRequest) {
  const authCheck = await requirePermission(request, 'canAccessAdmins')
  if (authCheck.error) return authCheck.error

  try {
    const body = await request.json()
    const {
      username,
      password,
      permissions = {}
    } = body

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password required' },
        { status: 400 }
      )
    }

    // Username kontrolü
    const existingAdmin = await prisma.admin.findUnique({
      where: { username }
    })

    if (existingAdmin) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 400 }
      )
    }

    // Şifreyi hashle
    const passwordHash = await bcrypt.hash(password, 10)

    // Yeni admin oluştur
    const newAdmin = await prisma.admin.create({
      data: {
        username,
        passwordHash,
        isSuperAdmin: false, // Normal adminler super admin olamaz
        canAccessDashboard: permissions.canAccessDashboard ?? true,
        canAccessBroadcast: permissions.canAccessBroadcast ?? false,
        canAccessStatistics: permissions.canAccessStatistics ?? false,
        canAccessTasks: permissions.canAccessTasks ?? false,
        canAccessShop: permissions.canAccessShop ?? false,
        canAccessWheel: permissions.canAccessWheel ?? false,
        canAccessSponsors: permissions.canAccessSponsors ?? false,
        canAccessRanks: permissions.canAccessRanks ?? false,
        canAccessSettings: permissions.canAccessSettings ?? false,
        canAccessChannels: permissions.canAccessChannels ?? false,
        canAccessUsers: permissions.canAccessUsers ?? false,
        canAccessAdmins: permissions.canAccessAdmins ?? false,
      },
      select: {
        id: true,
        username: true,
        isSuperAdmin: true,
        canAccessDashboard: true,
        canAccessBroadcast: true,
        canAccessStatistics: true,
        canAccessTasks: true,
        canAccessShop: true,
        canAccessWheel: true,
        canAccessSponsors: true,
        canAccessRanks: true,
        canAccessSettings: true,
        canAccessChannels: true,
        canAccessUsers: true,
        canAccessAdmins: true,
        createdAt: true,
      }
    })

    return NextResponse.json({
      success: true,
      admin: newAdmin
    })
  } catch (error) {
    console.error('Error creating admin:', error)
    return NextResponse.json(
      { error: 'Failed to create admin' },
      { status: 500 }
    )
  }
}
