import { NextResponse, NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { announceRandyStart } from '@/lib/randy'

// GET - Randy schedule'ları getir
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const includeSlots = searchParams.get('includeSlots') === 'true'
    const status = searchParams.get('status') // 'active', 'completed', 'cancelled'

    const whereClause: any = {}
    if (status) {
      whereClause.status = status
    }

    const schedules = await prisma.randySchedule.findMany({
      where: whereClause,
      include: includeSlots ? {
        slots: {
          orderBy: { schedTime: 'asc' }
        }
      } : undefined,
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ schedules })
  } catch (error) {
    console.error('Error fetching randy schedules:', error)
    return NextResponse.json({ error: 'Randy planları yüklenemedi' }, { status: 500 })
  }
}

// POST - Yeni Randy schedule oluştur
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      winnerCount,
      distributionHours,
      prizeText,
      sendAnnouncement = true,
      pinMessage = true,
      onePerUser = true,
      minMessages = 0,
      messagePeriod = 'none',
      startTime
    } = body

    // Validasyon
    if (!winnerCount || winnerCount < 1) {
      return NextResponse.json({ error: 'Kazanan sayısı gerekli' }, { status: 400 })
    }
    if (!distributionHours || distributionHours < 1) {
      return NextResponse.json({ error: 'Dağıtım süresi gerekli' }, { status: 400 })
    }
    if (!prizeText) {
      return NextResponse.json({ error: 'Ödül açıklaması gerekli' }, { status: 400 })
    }

    const start = startTime ? new Date(startTime) : new Date()

    // Schedule oluştur
    const schedule = await prisma.randySchedule.create({
      data: {
        winnerCount,
        distributionHours,
        prizeText,
        sendAnnouncement,
        pinMessage,
        onePerUser,
        minMessages,
        messagePeriod,
        startTime: start
      }
    })

    // Rastgele zaman slotları oluştur
    const totalSeconds = distributionHours * 3600
    const sliceLength = Math.floor(totalSeconds / winnerCount)
    const chosenTimes: Date[] = []

    for (let i = 0; i < winnerCount; i++) {
      const sliceStart = i * sliceLength
      const sliceEnd = i < winnerCount - 1 ? sliceStart + sliceLength - 1 : totalSeconds - 1
      const randomSec = Math.floor(Math.random() * (sliceEnd - sliceStart + 1)) + sliceStart
      const slotTime = new Date(start.getTime() + randomSec * 1000)
      chosenTimes.push(slotTime)
    }

    // Zamanları sırala
    chosenTimes.sort((a, b) => a.getTime() - b.getTime())

    // Slotları veritabanına ekle
    await Promise.all(
      chosenTimes.map(time =>
        prisma.randySlot.create({
          data: {
            scheduleId: schedule.id,
            schedTime: time
          }
        })
      )
    )

    // Oluşturulan schedule'ı slotlarıyla birlikte getir
    const scheduleWithSlots = await prisma.randySchedule.findUnique({
      where: { id: schedule.id },
      include: {
        slots: {
          orderBy: { schedTime: 'asc' }
        }
      }
    })

    // Başlangıç duyurusunu gönder
    if (sendAnnouncement) {
      try {
        const settings = await prisma.settings.findMany()
        const settingsMap = settings.reduce((acc: Record<string, string>, s) => ({ ...acc, [s.key]: s.value }), {})

        const botToken = settingsMap.telegram_bot_token || ''
        const activityGroupId = settingsMap.activity_group_id || ''
        const startTemplate = settingsMap.randy_start_template || ''
        const pinStartMessage = (settingsMap.randy_pin_start_message || 'true') === 'true'

        if (botToken && activityGroupId) {
          await announceRandyStart(
            botToken,
            Number(activityGroupId),
            {
              winnerCount,
              distributionHours,
              prizeText
            },
            pinStartMessage,
            startTemplate || undefined
          )
          console.log('✅ Randy başlangıç duyurusu gönderildi')
        }
      } catch (announceError) {
        console.error('Randy start announcement error:', announceError)
        // Duyuru hatası schedule oluşumunu engellemez
      }
    }

    return NextResponse.json({ schedule: scheduleWithSlots })
  } catch (error) {
    console.error('Create randy schedule error:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
