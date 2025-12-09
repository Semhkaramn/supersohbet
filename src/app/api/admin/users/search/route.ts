import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const rankId = searchParams.get('rank')
    const minPoints = searchParams.get('minPoints')
    const maxPoints = searchParams.get('maxPoints')
    const minMessages = searchParams.get('minMessages')

    // Build filter conditions
    const where: any = {
      isBanned: false // Only non-banned users
    }

    // Search by username or first name
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Filter by rank
    if (rankId && rankId !== 'all') {
      where.rankId = rankId
    }

    // Filter by points
    if (minPoints) {
      where.points = { ...where.points, gte: parseInt(minPoints) }
    }
    if (maxPoints) {
      where.points = { ...where.points, lte: parseInt(maxPoints) }
    }

    // Filter by message count
    if (minMessages) {
      where.messageCount = { gte: parseInt(minMessages) }
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        telegramId: true,
        username: true,
        firstName: true,
        lastName: true,
        points: true,
        xp: true,
        messageCount: true,
        rank: {
          select: {
            name: true
          }
        },
        isBanned: true
      },
      orderBy: [
        { points: 'desc' },
        { xp: 'desc' }
      ],
      take: 100 // Limit to 100 users for performance
    })

    return NextResponse.json({
      success: true,
      users
    })
  } catch (error) {
    console.error('Error searching users:', error)
    return NextResponse.json({
      success: false,
      error: 'Kullanıcılar aranırken hata oluştu'
    }, { status: 500 })
  }
}
