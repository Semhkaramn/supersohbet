import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    // En yüksek puanlı kullanıcıları getir
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        firstName: true,
        points: true,
        xp: true,
        totalMessages: true,
        rank: {
          select: {
            name: true,
            icon: true,
          }
        }
      },
      orderBy: [
        { points: 'desc' },
        { xp: 'desc' }
      ],
      take: 100
    })

    // Pozisyon numaralarını ekle
    const leaderboard = users.map((user, index) => ({
      ...user,
      position: index + 1
    }))

    // Mevcut kullanıcının pozisyonunu bul
    let currentUser = null
    if (userId) {
      const userIndex = leaderboard.findIndex(u => u.id === userId)
      if (userIndex !== -1) {
        currentUser = leaderboard[userIndex]
      } else {
        // Kullanıcı top 100'de değilse, ayrıca getir
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            username: true,
            firstName: true,
            points: true,
            xp: true,
            totalMessages: true,
            rank: {
              select: {
                name: true,
                icon: true,
              }
            }
          }
        })

        if (user) {
          // Kullanıcının gerçek pozisyonunu hesapla
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

          currentUser = {
            ...user,
            position: higherRankedCount + 1
          }
        }
      }
    }

    return NextResponse.json({
      leaderboard,
      currentUser
    })
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    return NextResponse.json(
      { error: 'Liderlik tablosu alınamadı' },
      { status: 500 }
    )
  }
}
