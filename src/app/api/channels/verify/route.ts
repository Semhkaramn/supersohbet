import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkChannelMembership } from '@/lib/telegram'
import { requireAuth } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Session kontrolü - artık body'den userId yerine session kullanıyoruz
    const session = await requireAuth(request)
    const userId = session.userId

    const body = await request.json()
    const { channelId } = body

    if (!channelId) {
      return NextResponse.json(
        { error: 'Channel ID required' },
        { status: 400 }
      )
    }

    // Kullanıcı ve kanal bilgilerini getir
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    const channel = await prisma.requiredChannel.findUnique({
      where: { id: channelId }
    })

    if (!user || !channel) {
      return NextResponse.json(
        { error: 'User or channel not found' },
        { status: 404 }
      )
    }

    console.log('🔍 Üyelik kontrolü başlıyor:', {
      userTelegramId: user.telegramId,
      userUsername: user.username,
      channelTelegramId: channel.channelId,
      channelName: channel.channelName,
      userId: user.id,
      channelDbId: channel.id
    })

    // Telegram API ile kanal üyeliğini kontrol et
    const isMember = await checkChannelMembership(
      user.telegramId,
      channel.channelId
    )

    console.log('📊 Üyelik kontrol sonucu:', {
      channelName: channel.channelName,
      channelId: channel.channelId,
      isMember: isMember
    })

    if (isMember) {
      // Üyeliği veritabanına kaydet
      await prisma.userChannelJoin.upsert({
        where: {
          userId_channelId: {
            userId: user.id,
            channelId: channel.id
          }
        },
        create: {
          userId: user.id,
          channelId: channel.id
        },
        update: {}
      })

      console.log('✅ Üyelik veritabanına kaydedildi')
      return NextResponse.json({ joined: true })
    }

    console.log('❌ Kullanıcı kanala üye değil')
    return NextResponse.json({ joined: false })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Oturum geçersiz. Lütfen tekrar giriş yapın.' },
        { status: 401 }
      )
    }
    console.error('Verify channel error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
