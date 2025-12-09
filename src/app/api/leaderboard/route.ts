import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCachedLeaderboard } from '@/lib/cache'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const sortBy = searchParams.get('sortBy') || 'points' // 'points' veya 'xp'

    const leaderboardData = await getCachedLeaderboard(
      sortBy,
      async () => {
        // Sıralamayı belirle
        const orderBy = sortBy === 'xp'
          ? [{ xp: 'desc' as const }, { points: 'desc' as const }]
          : [{ points: 'desc' as const }, { xp: 'desc' as const }]

        const users = await prisma.user.findMany({
          select: {
            id: true,
            telegramId: true,
            username: true,
            firstName: true,
            photoUrl: true,
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
          orderBy,
          take: 100
        })

        return users.map((user, index) => ({
          ...user,
          position: index + 1
        }))
      },
      300 // 5 minutes cache
    )

    // Mevcut kullanıcının pozisyonunu bul
    let currentUser = null
    if (userId) {
      const userIndex = leaderboardData.findIndex((u: any) => u.id === userId)
      if (userIndex !== -1) {
        currentUser = leaderboardData[userIndex]
      } else {
        // Kullanıcı top 100'de değilse, ayrıca getir
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            telegramId: true,
            username: true,
            firstName: true,
            photoUrl: true,
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
          // Kullanıcının gerçek pozisyonunu hesapla (sortBy'a göre)
          const higherRankedCount = sortBy === 'xp'
            ? await prisma.user.count({
                where: {
                  OR: [
                    { xp: { gt: user.xp } },
                    {
                      AND: [
                        { xp: user.xp },
                        { points: { gt: user.points } }
                      ]
                    }
                  ]
                }
              })
            : await prisma.user.count({
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
      leaderboard: leaderboardData,
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
