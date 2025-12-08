import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkAndRewardMilestones } from '@/lib/referral'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId gerekli' }, { status: 400 })
    }

    // Kullanıcıyı bul
    const user = await prisma.user.findUnique({
      where: { telegramId: userId },
      include: {
        referrals: {
          select: {
            id: true,
            firstName: true,
            username: true,
            points: true,
            xp: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        referredBy: {
          select: {
            id: true,
            firstName: true,
            username: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
    }

    // Tüm milestone'ları al (eğer tablo varsa)
    let milestones: Array<{
      id: string
      requiredCount: number
      rewardPoints: number
      name: string
      description: string | null
      completed: boolean
      progress: number
      remaining: number
    }> = []
    try {
      const allMilestones = await prisma.referralMilestone.findMany({
        where: { isActive: true },
        orderBy: { order: 'asc' }
      })

      // Kullanıcının tamamladığı milestone'ları al
      const completedMilestones = await prisma.userMilestoneCompletion.findMany({
        where: { userId: user.id },
        select: { milestoneId: true, completedAt: true, rewardClaimed: true }
      })

      const completedIds = new Set(completedMilestones.map(m => m.milestoneId))

      // Milestone'ları işle
      milestones = allMilestones.map(milestone => ({
        id: milestone.id,
        requiredCount: milestone.requiredCount,
        rewardPoints: milestone.rewardPoints,
        name: milestone.name,
        description: milestone.description,
        completed: completedIds.has(milestone.id),
        progress: Math.min(user.totalReferrals, milestone.requiredCount),
        remaining: Math.max(0, milestone.requiredCount - user.totalReferrals)
      }))
    } catch (milestoneError) {
      console.error('Milestone loading error (table may not exist yet):', milestoneError)
      // Database henüz migrate edilmemiş olabilir, boş array döndür
      milestones = []
    }

    // Eğer kullanıcının referans kodu yoksa oluştur
    if (!user.referralCode) {
      const referralCode = generateReferralCode(user.telegramId)
      await prisma.user.update({
        where: { id: user.id },
        data: { referralCode }
      })
      user.referralCode = referralCode
    }

    // Referans ayarlarını al
    const settings = await prisma.settings.findMany({
      where: {
        key: {
          in: ['referral_bonus_inviter', 'referral_bonus_invited']
        }
      }
    })

    const settingsMap = settings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {} as Record<string, string>)

    const referralLink = `https://t.me/${process.env.TELEGRAM_BOT_USERNAME || 'your_bot'}?start=${user.referralCode}`

    return NextResponse.json({
      referralCode: user.referralCode,
      referralLink,
      totalReferrals: user.totalReferrals,
      referralPoints: user.referralPoints,
      referrals: user.referrals,
      referredBy: user.referredBy,
      bonusInviter: Number.parseInt(settingsMap.referral_bonus_inviter || '100'),
      bonusInvited: Number.parseInt(settingsMap.referral_bonus_invited || '50'),
      milestones
    })
  } catch (error) {
    console.error('Referral info error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}

function generateReferralCode(telegramId: string): string {
  // Telegram ID'den benzersiz 8 karakterlik kod oluştur
  const hash = telegramId.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0)
  }, 0)
  return Math.abs(hash).toString(36).substring(0, 8).toUpperCase()
}
