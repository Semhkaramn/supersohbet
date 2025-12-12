import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCachedLeaderboard } from '@/lib/cache'

// ✅ OPTIMIZASYON: Cache revalidation - 5 dakika
export const revalidate = 300

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') // Opsiyonel - sadece kendi sıralamasını görmek için
    const sortBy = searchParams.get('sortBy') || 'points' // 'points' veya 'xp'

    console.log('📊 Leaderboard API çağrıldı:', { userId: userId || 'yok', sortBy })

    const leaderboardData = await getCachedLeaderboard(
      sortBy,
      async () => {
        // Sıralamayı belirle
        const orderBy = sortBy === 'xp'
          ? [{ xp: 'desc' as const }, { points: 'desc' as const }]
          : [{ points: 'desc' as const }, { xp: 'desc' as const }]

        console.log('🔍 Veritabanından kullanıcılar getiriliyor...')

        // ✅ FIX: Banlı kullanıcıları filtrele
        const users = await prisma.user.findMany({
          where: {
            isBanned: false // Sadece banlı OLMAYAN kullanıcılar
          },
          select: {
            id: true,
            telegramId: true,
            siteUsername: true,
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

        console.log(`✅ ${users.length} kullanıcı bulundu (banlı olmayanlar)`)

        return users.map((user, index) => ({
          ...user,
          position: index + 1
        }))
      },
      300 // 5 minutes cache
    )

    console.log(`📊 Leaderboard data: ${leaderboardData.length} kullanıcı`)

    // Mevcut kullanıcının pozisyonunu bul
    let currentUser = null
    if (userId) {
      console.log('🔍 Kullanıcı pozisyonu aranıyor:', userId)

      const userIndex = leaderboardData.findIndex((u: any) => u.id === userId)
      if (userIndex !== -1) {
        currentUser = leaderboardData[userIndex]
        console.log(`✅ Kullanıcı top 100'de bulundu: #${currentUser.position}`)
      } else {
        console.log('⚠️ Kullanıcı top 100\'de değil, ayrıca getiriliyor...')

        // Kullanıcı top 100'de değilse, ayrıca getir
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            telegramId: true,
            siteUsername: true,
            username: true,
            firstName: true,
            photoUrl: true,
            points: true,
            xp: true,
            totalMessages: true,
            isBanned: true, // Ban durumunu kontrol et
            rank: {
              select: {
                name: true,
                icon: true,
              }
            }
          }
        })

        if (!user) {
          console.log('❌ Kullanıcı bulunamadı')
        } else if (user.isBanned) {
          console.log('🚫 Kullanıcı banlı, leaderboard\'da gösterilmeyecek')
        } else {
          // ✅ FIX: Pozisyon hesaplarken de sadece banlı olmayanları say
          const higherRankedCount = sortBy === 'xp'
            ? await prisma.user.count({
                where: {
                  isBanned: false, // ✅ Banlı olmayanlar
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
                  isBanned: false, // ✅ Banlı olmayanlar
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
          console.log(`✅ Kullanıcı pozisyonu hesaplandı: #${currentUser.position}`)
        }
      }
    }

    return NextResponse.json({
      leaderboard: leaderboardData,
      currentUser,
      totalUsers: leaderboardData.length
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
      }
    })
  } catch (error) {
    console.error('❌ Leaderboard API hatası:', error)
    console.error('Hata detayı:', error instanceof Error ? error.message : 'Bilinmeyen hata')
    console.error('Stack trace:', error instanceof Error ? error.stack : 'Yok')

    return NextResponse.json(
      {
        error: 'Liderlik tablosu alınamadı',
        details: error instanceof Error ? error.message : 'Bilinmeyen hata'
      },
      { status: 500 }
    )
  }
}
