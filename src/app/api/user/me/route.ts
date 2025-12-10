import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { checkAndResetWheelSpins, getTurkeyToday, getTurkeyDateAgo } from '@/lib/utils'
import { getCached } from '@/lib/cache'

export async function GET(request: NextRequest) {
  try {
    // Session kontrolü
    const session = await requireAuth(request)

    // Kullanıcı bilgilerini getir
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
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
        { error: 'Kullanıcı bulunamadı' },
        { status: 404 }
      )
    }

    // Ban kontrolü
    if (user.isBanned) {
      return NextResponse.json({
        banned: true,
        banReason: user.banReason || 'Sistem kurallarını ihlal ettiniz.',
        bannedAt: user.bannedAt,
        bannedBy: user.bannedBy
      }, { status: 403 })
    }

    // Çark haklarını kontrol et ve gerekirse sıfırla
    try {
      const [wheelResetTimeSetting, dailyWheelSpinsSetting] = await Promise.all([
        prisma.settings.findUnique({ where: { key: 'wheel_reset_time' } }),
        prisma.settings.findUnique({ where: { key: 'daily_wheel_spins' } })
      ])

      const wheelResetTime = wheelResetTimeSetting?.value || '00:00'
      const dailyWheelSpins = Number.parseInt(dailyWheelSpinsSetting?.value || '3')

      await checkAndResetWheelSpins(session.userId, wheelResetTime, dailyWheelSpins)

      // Güncellenmiş kullanıcıyı tekrar al
      const updatedUser = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { dailySpinsLeft: true }
      })
      if (updatedUser) {
        user.dailySpinsLeft = updatedUser.dailySpinsLeft
      }
    } catch (wheelResetError) {
      console.error('Wheel reset error:', wheelResetError)
    }

    // Kullanıcının XP'sine göre rütbesini güncelle
    const currentRank = await prisma.rank.findFirst({
      where: { minXp: { lte: user.xp } },
      orderBy: { minXp: 'desc' }
    })

    if (currentRank && user.rankId !== currentRank.id) {
      await prisma.user.update({
        where: { id: session.userId },
        data: { rankId: currentRank.id }
      })
      user.rankId = currentRank.id
      user.rank = currentRank
    }

    // Bir sonraki rütbeyi bul
    const nextRank = await prisma.rank.findFirst({
      where: { minXp: { gt: user.xp } },
      orderBy: { minXp: 'asc' }
    })

    // Tüm rütbeleri getir
    const allRanks = await prisma.rank.findMany({
      orderBy: { minXp: 'asc' }
    })

    // Message stats - cache kullan
    const messageStats = await getCached(
      `user_message_stats_${session.userId}`,
      async () => {
        const messages = await prisma.messageStats.findMany({
          where: { userId: session.userId },
          select: { createdAt: true }
        })

        const now = new Date()
        const today = getTurkeyToday()
        const weekAgo = getTurkeyDateAgo(7)
        const monthAgo = getTurkeyDateAgo(30)

        return {
          daily: messages.filter(m => m.createdAt >= today).length,
          weekly: messages.filter(m => m.createdAt >= weekAgo).length,
          monthly: messages.filter(m => m.createdAt >= monthAgo).length,
          total: messages.length
        }
      },
      300 // 5 dakika cache
    )

    // Leaderboard sırasını hesapla
    const leaderboardRank = await prisma.user.count({
      where: {
        points: { gt: user.points },
        isBanned: false
      }
    }) + 1

    return NextResponse.json({
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      photoUrl: user.photoUrl,
      points: user.points,
      xp: user.xp,
      rank: user.rank,
      nextRank,
      allRanks,
      dailySpinsLeft: user.dailySpinsLeft,
      lastSpinReset: user.lastSpinReset,
      totalMessages: user.totalMessages,
      messageStats,
      pointHistory: user.pointHistory,
      leaderboardRank,
      referralCode: user.referralCode,
      totalReferrals: user.totalReferrals,
      referralPoints: user.referralPoints,
      trc20WalletAddress: user.trc20WalletAddress,
      telegramId: user.telegramId,
      hadStart: user.hadStart,
      channelsVerified: user.channelsVerified,
      createdAt: user.createdAt
    })

  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Oturum geçersiz. Lütfen tekrar giriş yapın.' },
        { status: 401 }
      )
    }

    console.error('User info error:', error)
    return NextResponse.json(
      { error: 'Kullanıcı bilgileri alınırken hata oluştu' },
      { status: 500 }
    )
  }
}
