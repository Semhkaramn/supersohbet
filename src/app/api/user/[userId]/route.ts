import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        rank: true,
        pointHistory: {
          orderBy: { createdAt: 'desc' },
          take: 50
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Kullanıcının XP'sine göre rütbesini güncelle
    const currentRank = await prisma.rank.findFirst({
      where: { minXp: { lte: user.xp } },
      orderBy: { minXp: 'desc' }
    })

    if (currentRank && user.rankId !== currentRank.id) {
      await prisma.user.update({
        where: { id: userId },
        data: { rankId: currentRank.id }
      })
    }

    // Bir sonraki rütbeyi bul
    const nextRank = await prisma.rank.findFirst({
      where: { minXp: { gt: user.xp } },
      orderBy: { minXp: 'asc' }
    })

    // Leaderboard sıralamasını hesapla (Puana göre, eşitlikte XP'ye göre)
    const higherRankedCount = await prisma.user.count({
      where: {
        OR: [
          { points: { gt: user.points } },
          {
            AND: [
              { points: user.points },
              { xp: { gt: user.xp } }
            ]
          }
        ]
      }
    })
    const leaderboardRank = higherRankedCount + 1

    // Mesaj istatistiklerini hesapla
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [dailyMessages, weeklyMessages, monthlyMessages, totalAllMessages] = await Promise.all([
      prisma.messageStats.count({
        where: {
          userId: user.id,
          createdAt: { gte: today }
        }
      }),
      prisma.messageStats.count({
        where: {
          userId: user.id,
          createdAt: { gte: weekAgo }
        }
      }),
      prisma.messageStats.count({
        where: {
          userId: user.id,
          createdAt: { gte: monthAgo }
        }
      }),
      prisma.messageStats.count({
        where: {
          userId: user.id
        }
      })
    ])

    return NextResponse.json({
      id: user.id,
      telegramId: user.telegramId,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      points: user.points,
      xp: user.xp,
      totalMessages: user.totalMessages,
      totalReferrals: user.totalReferrals,
      referralPoints: user.referralPoints,
      messageStats: {
        daily: dailyMessages,
        weekly: weeklyMessages,
        monthly: monthlyMessages,
        total: totalAllMessages
      },
      dailySpinsLeft: user.dailySpinsLeft,
      rank: currentRank || user.rank,
      nextRank,
      leaderboardRank,
      pointHistory: user.pointHistory,
      createdAt: user.createdAt
    })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
