import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { telegramUser } = body

    if (!telegramUser || !telegramUser.id) {
      return NextResponse.json(
        { error: 'Invalid telegram user data' },
        { status: 400 }
      )
    }

    // Kullanıcıyı bul veya oluştur
    let user = await prisma.user.findUnique({
      where: { telegramId: String(telegramUser.id) }
    })

    if (!user) {
      // Yeni kullanıcı oluştur
      user = await prisma.user.create({
        data: {
          telegramId: String(telegramUser.id),
          username: telegramUser.username,
          firstName: telegramUser.first_name,
          lastName: telegramUser.last_name,
        }
      })
    }

    // Aktif zorunlu kanalları getir
    const requiredChannels = await prisma.requiredChannel.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' }
    })

    if (requiredChannels.length === 0) {
      // Zorunlu kanal yoksa direkt dashboard'a yönlendir
      return NextResponse.json({
        userId: user.id,
        needsChannelJoin: false
      })
    }

    // Kullanıcının katıldığı kanalları kontrol et
    const userChannelJoins = await prisma.userChannelJoin.findMany({
      where: {
        userId: user.id,
        channelId: { in: requiredChannels.map(ch => ch.id) }
      }
    })

    const joinedChannelIds = userChannelJoins.map(join => join.channelId)
    const needsChannelJoin = requiredChannels.some(
      channel => !joinedChannelIds.includes(channel.id)
    )

    return NextResponse.json({
      userId: user.id,
      needsChannelJoin
    })
  } catch (error) {
    console.error('Check channels error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
