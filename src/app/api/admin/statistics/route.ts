import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const sortBy = searchParams.get('sortBy') || 'points' // rank, points, messages
    const sortOrder = searchParams.get('sortOrder') || 'desc' // asc, desc
    const bannedFilter = searchParams.get('banned') // 'true', 'false', or null

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Build where clause for users
    const whereClause: any = {}
    if (search) {
      whereClause.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { telegramId: { contains: search } }
      ]
    }
    if (bannedFilter !== null) {
      whereClause.isBanned = bannedFilter === 'true'
    }

    // Determine sort order
    let orderBy: any = {}
    if (sortBy === 'points') {
      orderBy = { points: sortOrder }
    } else if (sortBy === 'messages') {
      orderBy = { totalMessages: sortOrder }
    } else if (sortBy === 'rank') {
      orderBy = { rank: { minXp: sortOrder } }
    }

    // Get users with statistics
    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        telegramId: true,
        username: true,
        firstName: true,
        lastName: true,
        photoUrl: true,
        points: true,
        xp: true,
        totalMessages: true,
        dailySpinsLeft: true,
        isBanned: true,
        banReason: true,
        bannedAt: true,
        bannedBy: true,
        createdAt: true,
        totalReferrals: true,
        referralPoints: true,
        rank: {
          select: {
            name: true,
            icon: true,
            color: true,
            minXp: true
          }
        },
        _count: {
          select: {
            purchases: true,
            wheelSpins: true,
            messages: true
          }
        }
      },
      orderBy,
      take: 100
    })

    // Get overall statistics
    const [
      totalUsers,
      bannedUsers,
      totalMessages,
      dailyMessages,
      weeklyMessages,
      monthlyMessages
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isBanned: true } }),
      prisma.messageStats.count(),
      prisma.messageStats.count({ where: { createdAt: { gte: today } } }),
      prisma.messageStats.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.messageStats.count({ where: { createdAt: { gte: monthAgo } } })
    ])

    return NextResponse.json({
      users,
      stats: {
        totalUsers,
        bannedUsers,
        activeUsers: totalUsers - bannedUsers,
        messages: {
          total: totalMessages,
          daily: dailyMessages,
          weekly: weeklyMessages,
          monthly: monthlyMessages
        }
      }
    })
  } catch (error) {
    console.error('Get statistics error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
