import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserProfilePhoto } from '@/lib/telegram'
import { checkAndResetWheelSpins, getTurkeyToday, getTurkeyDateAgo } from '@/lib/utils'
import { requireAuth } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Session kontrolü - artık URL parametresi yerine session kullanıyoruz
    const session = await requireAuth(request)
    const userId = session.userId

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        rank: true,
        pointHistory: {
          orderBy: { createdAt: 'desc' },
          take: 50
        }
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

    // Çark haklarını kontrol et ve gerekirse sıfırla
    try {
      const [wheelResetTimeSetting, dailyWheelSpinsSetting] = await Promise.all([
        prisma.settings.findUnique({ where: { key: 'wheel_reset_time' } }),
        prisma.settings.findUnique({ where: { key: 'daily_wheel_spins' } })
      ])

      const wheelResetTime = wheelResetTimeSetting?.value || '00:00'
      const dailyWheelSpins = Number.parseInt(dailyWheelSpinsSetting?.value || '3')

      await checkAndResetWheelSpins(userId, wheelResetTime, dailyWheelSpins)

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

    // Telegram profil fotoğrafını güncelle
    try {
      if (user.telegramId) {
        const numericUserId = Number.parseInt(user.telegramId, 10)
        if (!Number.isNaN(numericUserId)) {
          const photoUrl = await getUserProfilePhoto(numericUserId)
          if (photoUrl && photoUrl !== user.photoUrl) {
            await prisma.user.update({
              where: { id: userId },
              data: { photoUrl }
            })
            user.photoUrl = photoUrl
          }
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

    // Tüm rank listesini al
    const allRanks = await prisma.rank.findMany({
      orderBy: { minXp: 'asc' }
    })

    // Leaderboard sıralamasını hesapla (Puana göre, eşitlikte XP'ye göre)
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

    // Mesaj istatistiklerini hesapla
    const today = getTurkeyToday() // Türkiye saatine göre bugün
    const weekAgo = getTurkeyDateAgo(7) // 7 gün önce
    const monthAgo = getTurkeyDateAgo(30) // 30 gün önce

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
      messageStats: {
        daily: dailyMessages,
        weekly: weeklyMessages,
        monthly: monthlyMessages,
        total: totalAllMessages
      },
      dailySpinsLeft: user.dailySpinsLeft,
      rank: currentRank || user.rank,
      nextRank,
      allRanks,
      leaderboardRank,
      pointHistory: user.pointHistory,
      createdAt: user.createdAt
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Oturum geçersiz. Lütfen tekrar giriş yapın.' },
        { status: 401 }
      )
    }
    console.error('Get user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
