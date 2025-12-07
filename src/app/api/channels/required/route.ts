import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    // Aktif zorunlu kanalları getir
    const requiredChannels = await prisma.requiredChannel.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' }
    })

    // Kullanıcının katıldığı kanalları getir
    const userChannelJoins = await prisma.userChannelJoin.findMany({
      where: {
        userId,
        channelId: { in: requiredChannels.map(ch => ch.id) }
      }
    })

    const joinedChannelIds = new Set(userChannelJoins.map(join => join.channelId))

    // Kanal listesini katılım durumu ile birlikte döndür
    const channels = requiredChannels.map(channel => ({
      id: channel.id,
      channelId: channel.channelId,
      channelName: channel.channelName,
      channelLink: channel.channelLink,
      joined: joinedChannelIds.has(channel.id)
    }))

    return NextResponse.json({ channels })
  } catch (error) {
    console.error('Get required channels error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
