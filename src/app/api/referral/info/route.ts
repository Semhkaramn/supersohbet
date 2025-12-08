import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
      bonusInvited: Number.parseInt(settingsMap.referral_bonus_invited || '50')
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
