import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Toplam ziyaret sayısını al
    const totalVisits = await prisma.siteVisit.count()

    // Bugünkü ziyaretleri al
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayVisits = await prisma.siteVisit.count({
      where: {
        createdAt: {
          gte: today
        }
      }
    })

    // Benzersiz ziyaretçi sayısı (IP bazlı)
    const uniqueVisitors = await prisma.siteVisit.groupBy({
      by: ['ipAddress'],
      _count: true
    })

    return NextResponse.json({
      totalVisits,
      todayVisits,
      uniqueVisitors: uniqueVisitors.length
    })
  } catch (error) {
    console.error('Error getting visit count:', error)
    return NextResponse.json(
      { error: 'Failed to get visit count' },
      { status: 500 }
    )
  }
}
