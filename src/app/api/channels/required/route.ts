import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkChannelMembership } from '@/lib/telegram'

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

    // Kullanıcı bilgisini getir
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // ✅ Telegram bağlantısı yoksa kanal kontrolü yapılamaz
    if (!user.telegramId) {
      const requiredChannels = await prisma.requiredChannel.findMany({
        where: { isActive: true },
        orderBy: { order: 'asc' }
      })

      return NextResponse.json({
        channels: requiredChannels.map(ch => ({
          id: ch.id,
          channelId: ch.channelId,
          channelName: ch.channelName,
          channelLink: ch.channelLink,
          channelUsername: ch.channelId.startsWith('@') ? ch.channelId.substring(1) : undefined,
          joined: false
        }))
      })
    }

    // Aktif zorunlu kanalları getir
    const requiredChannels = await prisma.requiredChannel.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' }
    })

    // Kullanıcının katıldığı kanalları getir (veritabanından)
    const userChannelJoins = await prisma.userChannelJoin.findMany({
      where: {
        userId,
        channelId: { in: requiredChannels.map((ch) => ch.id) }
      }
    })

    const joinedChannelIds = new Set(userChannelJoins.map((join) => join.channelId))

    // GERÇEK ZAMANLI TELEGRAM API KONTROLÜ
    console.log('🔍 Gerçek zamanlı kanal üyelik kontrolü başlıyor...')
    const realTimeChecks = await Promise.all(
      requiredChannels.map(async (channel) => {
        try {
          // Telegram API ile gerçek üyelik durumunu kontrol et
          // Not: Bu noktada telegramId kesinlikle var (yukarıda null check yapıldı)
          const isMemberNow = await checkChannelMembership(
            user.telegramId!,
            channel.channelId
          )

          console.log(`📊 ${channel.channelName}: ${isMemberNow ? '✅ ÜYE' : '❌ ÜYE DEĞİL'}`)

          // Eğer gerçekte üyeyse VE DB'de kayıt yoksa, kaydet
          if (isMemberNow && !joinedChannelIds.has(channel.id)) {
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
            console.log(`✅ ${channel.channelName} üyeliği DB'ye kaydedildi`)
          }

          // Eğer gerçekte üye DEĞİLse VE DB'de kayıt varsa, kaydı sil
          if (!isMemberNow && joinedChannelIds.has(channel.id)) {
            await prisma.userChannelJoin.delete({
              where: {
                userId_channelId: {
                  userId: user.id,
                  channelId: channel.id
                }
              }
            })
            console.log(`🗑️ ${channel.channelName} üyeliği DB'den silindi (kullanıcı kanaldan çıkmış)`)
          }

          return {
            channelId: channel.id,
            isMember: isMemberNow
          }
        } catch (error) {
          console.error(`❌ ${channel.channelName} kontrolünde hata:`, error)
          // Hata durumunda DB kaydına güven
          return {
            channelId: channel.id,
            isMember: joinedChannelIds.has(channel.id)
          }
        }
      })
    )

    // Gerçek zamanlı kontrol sonuçlarını kullanarak kanal listesini oluştur
    const realTimeMembershipMap = new Map(
      realTimeChecks.map(check => [check.channelId, check.isMember])
    )

    // Kanal listesini GERÇEK üyelik durumu ile birlikte döndür
    const channels = requiredChannels.map((channel) => {
      // channelId'den username çıkar (@ işaretini kaldır)
      let channelUsername = channel.channelId
      if (channelUsername.startsWith('@')) {
        channelUsername = channelUsername.substring(1)
      }

      return {
        id: channel.id,
        channelId: channel.channelId,
        channelName: channel.channelName,
        channelLink: channel.channelLink,
        channelUsername: channelUsername.startsWith('-') ? undefined : channelUsername,
        joined: realTimeMembershipMap.get(channel.id) || false
      }
    })

    return NextResponse.json({ channels })
  } catch (error) {
    console.error('Get required channels error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
