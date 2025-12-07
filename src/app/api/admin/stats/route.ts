import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const [
      totalUsers,
      totalPurchases,
      totalSpins,
      pointsSum
    ] = await Promise.all([
      prisma.user.count(),
      prisma.userPurchase.count(),
      prisma.wheelSpin.count(),
      prisma.user.aggregate({
        _sum: { points: true }
      })
    ])

    return NextResponse.json({
      totalUsers,
      totalPurchases,
      totalSpins,
      totalPoints: pointsSum._sum.points || 0
    })
  } catch (error) {
    console.error('Get admin stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
