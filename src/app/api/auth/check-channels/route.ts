import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkChannelMembership } from '@/lib/telegram'

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

    // Bakım modu kontrolü
    const maintenanceSetting = await prisma.settings.findUnique({
      where: { key: 'maintenance_mode' }
    })

    if (maintenanceSetting?.value === 'true') {
      return NextResponse.json({
        maintenanceMode: true,
        message: 'Sistem bakımda'
      })
    }

    console.log('👤 Kullanıcı giriş yapıyor:', {
      telegramId: telegramUser.id,
      username: telegramUser.username,
      firstName: telegramUser.first_name
    })

    // Kullanıcıyı bul veya oluştur
    let user = await prisma.user.findUnique({
      where: { telegramId: String(telegramUser.id) }
    })

    if (!user) {
      console.log('🆕 Yeni kullanıcı oluşturuluyor...')
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

    // Ban kontrolü
    if (user.isBanned) {
      return NextResponse.json({
        isBanned: true,
        banReason: user.banReason,
        bannedAt: user.bannedAt,
        bannedBy: user.bannedBy
      })
    }

    // Aktif zorunlu kanalları getir
    const requiredChannels = await prisma.requiredChannel.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' }
    })

    console.log(`📺 ${requiredChannels.length} zorunlu kanal bulundu`)

    if (requiredChannels.length === 0) {
      // Zorunlu kanal yoksa direkt dashboard'a yönlendir
      console.log('✅ Zorunlu kanal yok, dashboard\'a yönlendiriliyor')
      return NextResponse.json({
        userId: user.id,
        needsChannelJoin: false
      })
    }

    // Her kanal için GERÇEK Telegram üyeliğini kontrol et
    console.log('🔍 Telegram API ile kanal üyelikleri kontrol ediliyor...')

    const membershipChecks = await Promise.all(
      requiredChannels.map(async (channel) => {
        try {
          const isMember = await checkChannelMembership(
            String(telegramUser.id),
            channel.channelId
          )

          console.log(`📊 ${channel.channelName}: ${isMember ? '✅ ÜYE' : '❌ ÜYE DEĞİL'}`)

          // Eğer üyeyse ve DB'de kayıt yoksa, kaydet
          if (isMember) {
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
          }

          return { channelId: channel.id, isMember }
        } catch (error) {
          console.error(`❌ ${channel.channelName} kontrolünde hata:`, error)
          return { channelId: channel.id, isMember: false }
        }
      })
    )

    // Tüm kanallara üye mi kontrol et
    const allJoined = membershipChecks.every((check) => check.isMember)
    const needsChannelJoin = !allJoined

    console.log(`🎯 Sonuç: ${allJoined ? 'Tüm kanallara üye ✅' : 'Eksik kanal var ❌'}`)

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
