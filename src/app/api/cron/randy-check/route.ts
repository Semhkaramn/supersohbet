import { NextRequest, NextResponse } from 'next/server'
import { checkRandySlots, announceRandyWinner } from '@/lib/randy'
import { prisma } from '@/lib/prisma'

// Randy slotlarını periyodik olarak kontrol et
export async function GET(request: NextRequest) {
  try {
    // Güvenlik: Sadece authorized requestlere izin ver
    const authHeader = request.headers.get('authorization')
    const expectedAuth = process.env.CRON_SECRET || 'default-secret'

    if (authHeader !== `Bearer ${expectedAuth}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔍 Randy slot kontrolü başlatılıyor...')

    // Slotları kontrol et
    const results = await checkRandySlots()

    console.log(`✅ Randy kontrol tamamlandı: ${results.length} slot işlendi`)

    // Ayarları al
    const settings = await prisma.settings.findMany()
    const settingsMap = settings.reduce((acc: Record<string, string>, s) => ({ ...acc, [s.key]: s.value }), {})

    const botToken = settingsMap.telegram_bot_token || ''
    const activityGroupId = settingsMap.activity_group_id || ''
    const sendAnnouncement = (settingsMap.randy_send_announcement || 'true') === 'true'
    const pinMessage = (settingsMap.randy_pin_message || 'true') === 'true'

    // Kazananları duyur
    let announcedCount = 0
    for (const result of results) {
      if (result.assigned && result.winner && result.prizeText && sendAnnouncement && botToken && activityGroupId) {
        const success = await announceRandyWinner(
          botToken,
          Number(activityGroupId),
          result.winner,
          result.prizeText,
          pinMessage
        )

        if (success) {
          announcedCount++

          // Slot'u güncelle - duyuruldu olarak işaretle
          if (result.slotId) {
            await prisma.randySlot.update({
              where: { id: result.slotId },
              data: { groupAnnounced: true }
            })
          }
        }
      }
    }

    console.log(`📢 ${announcedCount} kazanan duyuruldu`)

    return NextResponse.json({
      success: true,
      message: 'Randy check completed',
      slotsChecked: results.length,
      winnersAnnounced: announcedCount
    })
  } catch (error) {
    console.error('Randy cron error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// POST metodu da ekle (Netlify scheduled functions için)
export async function POST(request: NextRequest) {
  return GET(request)
}
