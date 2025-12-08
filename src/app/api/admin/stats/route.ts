import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [
      totalUsers,
      totalPurchases,
      totalSpins,
      pointsSum,
      totalMessages,
      dailyMessages,
      weeklyMessages,
      monthlyMessages
    ] = await Promise.all([
      prisma.user.count(),
      prisma.userPurchase.count(),
      prisma.wheelSpin.count(),
      prisma.user.aggregate({
        _sum: { points: true }
      }),
      prisma.message.count(),
      prisma.message.count({
        where: { createdAt: { gte: today } }
      }),
      prisma.message.count({
        where: { createdAt: { gte: weekAgo } }
      }),
      prisma.message.count({
        where: { createdAt: { gte: monthAgo } }
      })
    ])

    return NextResponse.json({
      totalUsers,
      totalPurchases,
      totalSpins,
      totalPoints: pointsSum._sum.points || 0,
      messages: {
        total: totalMessages,
        daily: dailyMessages,
        weekly: weeklyMessages,
        monthly: monthlyMessages
      }
    })
  } catch (error) {
    console.error('Get admin stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
