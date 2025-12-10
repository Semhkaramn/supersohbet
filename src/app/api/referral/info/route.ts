import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserProfilePhoto } from '@/lib/telegram'
import { requireAuth } from '@/lib/auth'

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

export async function GET(request: NextRequest) {
  try {
    // Session kontrolü - artık query parametresi yerine session kullanıyoruz
    const session = await requireAuth(request)
    const userId = session.userId

    // Kullanıcıyı bul
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        referrals: {
          select: {
            id: true,
            telegramId: true,
            firstName: true,
            username: true,
            photoUrl: true,
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
            telegramId: true,
            firstName: true,
            username: true,
            photoUrl: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
    }

    // Tüm referralların profil fotoğraflarını güncelle (paralel olarak)
    await Promise.all([
      ...user.referrals.map(ref => updateUserPhoto(ref.id, ref.telegramId)),
      user.referredBy ? updateUserPhoto(user.referredBy.id, user.referredBy.telegramId) : null
    ])

    // Güncellenmiş kullanıcıları tekrar çek
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        referrals: {
          select: {
            id: true,
            telegramId: true,
            firstName: true,
            username: true,
            photoUrl: true,
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
            telegramId: true,
            firstName: true,
            username: true,
            photoUrl: true
          }
        }
      }
    })

    if (!updatedUser) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
    }

    // Referans ayarlarını al
    const settings = await prisma.settings.findMany({
      where: {
        key: {
          in: ['referral_bonus_inviter', 'referral_bonus_invited', 'telegram_bot_username']
        }
      }
    })

    const settingsMap = settings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {} as Record<string, string>)

    const botUsername = process.env.TELEGRAM_BOT_USERNAME || settingsMap.telegram_bot_username || 'supersohbet_bot'
    // Telegram ID'yi direk kullan - daha basit ve güvenli
    const referralLink = `https://t.me/${botUsername}?start=ref_${updatedUser.telegramId}`

    return NextResponse.json({
      referralCode: updatedUser.telegramId, // Telegram ID kullanıyoruz artık
      referralLink,
      totalReferrals: updatedUser.totalReferrals,
      referralPoints: updatedUser.referralPoints,
      referrals: updatedUser.referrals,
      referredBy: updatedUser.referredBy,
      bonusInviter: Number.parseInt(settingsMap.referral_bonus_inviter || '100'),
      bonusInvited: Number.parseInt(settingsMap.referral_bonus_invited || '50')
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Oturum geçersiz. Lütfen tekrar giriş yapın.' },
        { status: 401 }
      )
    }
    console.error('Referral info error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
