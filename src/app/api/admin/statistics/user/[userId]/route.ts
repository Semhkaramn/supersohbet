import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params

    // Get user with all relations
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        rank: true,
        referredBy: {
          select: {
            id: true,
            username: true,
            firstName: true
          }
        },
        referrals: {
          select: {
            id: true,
            username: true,
            firstName: true,
            createdAt: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Kullanıcı bulunamadı' },
        { status: 404 }
      )
    }

    // Get wheel spin history
    const wheelSpins = await prisma.wheelSpin.findMany({
      where: { userId },
      include: {
        prize: {
          select: {
            name: true,
            points: true,
            color: true
          }
        }
      },
      orderBy: { spunAt: 'desc' },
      take: 50
    })

    // Get point history
    const pointHistory = await prisma.pointHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100
    })

    // Get purchase history
    const purchases = await prisma.userPurchase.findMany({
      where: { userId },
      include: {
        item: {
          select: {
            name: true,
            description: true,
            imageUrl: true
          }
        }
      },
      orderBy: { purchasedAt: 'desc' },
      take: 50
    })

    // Get task completion history
    const taskHistory = await prisma.taskCompletion.findMany({
      where: {
        userId,
        isCompleted: true,
        rewardClaimed: true
      },
      include: {
        task: {
          select: {
            title: true,
            description: true,
            category: true,
            taskType: true,
            xpReward: true,
            pointsReward: true
          }
        }
      },
      orderBy: { claimedAt: 'desc' },
      take: 100
    })

    // Get message statistics by period
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [dailyMessages, weeklyMessages, monthlyMessages, recentMessages] = await Promise.all([
      prisma.messageStats.count({
        where: { userId, createdAt: { gte: today } }
      }),
      prisma.messageStats.count({
        where: { userId, createdAt: { gte: weekAgo } }
      }),
      prisma.messageStats.count({
        where: { userId, createdAt: { gte: monthAgo } }
      }),
      prisma.messageStats.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          messageLength: true,
          earnedReward: true,
          createdAt: true
        }
      })
    ])

    // Calculate XP history from point history
    const xpHistory = pointHistory.filter(ph =>
      ph.type.includes('xp') || ph.type === 'message_reward'
    )

    return NextResponse.json({
      user,
      wheelSpins,
      pointHistory,
      xpHistory,
      purchases,
      taskHistory,
      messageStats: {
        daily: dailyMessages,
        weekly: weeklyMessages,
        monthly: monthlyMessages,
        total: user.totalMessages,
        recent: recentMessages
      }
    })
  } catch (error) {
    console.error('Get user statistics error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
