import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserProfilePhoto } from '@/lib/telegram'

// Profil fotoğrafını güncelle
async function updateUserPhoto(userId: string, telegramId: string): Promise<string | null> {
  try {
    const numericUserId = Number.parseInt(telegramId, 10)
    if (Number.isNaN(numericUserId)) return null

    const photoUrl = await getUserProfilePhoto(numericUserId)

    if (photoUrl) {
      // Veritabanındaki photoUrl'i güncelle
      await prisma.user.update({
        where: { id: userId },
        data: { photoUrl }
      })
    }

    return photoUrl
  } catch (error) {
    console.error('Error updating user photo:', error)
    return null
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const sortBy = searchParams.get('sortBy') || 'points' // 'points' veya 'xp'

    // Sıralamayı belirle
    const orderBy = sortBy === 'xp'
      ? [{ xp: 'desc' as const }, { points: 'desc' as const }]
      : [{ points: 'desc' as const }, { xp: 'desc' as const }]

    // En yüksek puanlı veya XP'li kullanıcıları getir
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

    // Tüm kullanıcıların profil fotoğraflarını güncelle (paralel olarak)
    await Promise.all(
      users.map(user => updateUserPhoto(user.id, user.telegramId))
    )

    // Güncellenmiş kullanıcıları tekrar çek
    const updatedUsers = await prisma.user.findMany({
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

    // Pozisyon numaralarını ekle
    const leaderboard = updatedUsers.map((user, index) => ({
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
          // Kullanıcının profil fotoğrafını güncelle
          const updatedPhotoUrl = await updateUserPhoto(user.id, user.telegramId)
          if (updatedPhotoUrl) {
            user.photoUrl = updatedPhotoUrl
          }

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
