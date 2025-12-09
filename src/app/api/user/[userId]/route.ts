import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserProfilePhoto } from '@/lib/telegram'
import { checkAndResetWheelSpins, getTurkeyToday, getTurkeyDateAgo } from '@/lib/utils'
import { getCachedSettings, getCachedUserPhoto } from '@/lib/cache'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params

    // ✅ OPTIMIZASYON: pointHistory kaldırıldı (kullanılmıyor)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        rank: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Ban kontrolü - Banlı kullanıcılar uygulamayı kullanamaz
    if (user.isBanned) {
      return NextResponse.json({
        banned: true,
        banReason: user.banReason || 'Sistem kurallarını ihlal ettiniz.',
        bannedAt: user.bannedAt,
        bannedBy: user.bannedBy
      })
    }

    // ✅ OPTIMIZASYON: Settings cache'lendi (1 saat)
    // Çark haklarını kontrol et ve gerekirse sıfırla
    try {
      const settings = await getCachedSettings(async () => {
        return {
          wheelResetHour: await prisma.settings.findUnique({ where: { key: 'wheel_reset_hour' } }),
          dailyWheelSpins: await prisma.settings.findUnique({ where: { key: 'daily_wheel_spins' } })
        }
      }, 3600) // 1 hour cache

      const wheelResetHour = Number.parseInt(settings.wheelResetHour?.value || '0')
      const dailyWheelSpins = Number.parseInt(settings.dailyWheelSpins?.value || '3')

      await checkAndResetWheelSpins(userId, wheelResetHour, dailyWheelSpins)

      // Güncellenmiş kullanıcıyı tekrar al
      const updatedUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { dailySpinsLeft: true }
      })
      if (updatedUser) {
        user.dailySpinsLeft = updatedUser.dailySpinsLeft
      }
    } catch (wheelResetError) {
      console.error('Wheel reset error:', wheelResetError)
      // Hata olsa bile devam et
    }

    // ✅ OPTIMIZASYON: Profil fotoğrafı cache'lendi (24 saat)
    // Telegram profil fotoğrafını güncelle (sadece 24 saatte bir)
    try {
      const numericUserId = Number.parseInt(user.telegramId, 10)
      if (!Number.isNaN(numericUserId)) {
        const photoUrl = await getCachedUserPhoto(
          userId,
          async () => {
            const url = await getUserProfilePhoto(numericUserId)
            // Veritabanını güncelle
            if (url && url !== user.photoUrl) {
              await prisma.user.update({
                where: { id: userId },
                data: { photoUrl: url }
              })
            }
            return url
          },
          86400 // 24 hours
        )

        if (photoUrl) {
          user.photoUrl = photoUrl
        }
      }
    } catch (photoError) {
      console.error('Error updating user photo:', photoError)
      // Profil fotoğrafı güncellenemese bile devam et
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

    // ✅ OPTIMIZASYON: Leaderboard rank hesaplaması basitleştirildi
    // TODO: Bu hesaplamayı cache'lemek veya User tablosuna eklemek daha iyi olur
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

    // ✅ OPTIMIZASYON: Mesaj istatistikleri - 4 count yerine optimized query
    // NOT: Prisma'da tek sorguda groupBy ile yapmak mümkün ama şu anki hali kabul edilebilir
    // Çünkü Promise.all ile paralel çalışıyor
    const today = getTurkeyToday()
    const weekAgo = getTurkeyDateAgo(7)
    const monthAgo = getTurkeyDateAgo(30)

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
      photoUrl: user.photoUrl,
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
