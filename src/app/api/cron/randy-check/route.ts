import { NextRequest, NextResponse } from 'next/server'
import { checkRandySlots, announceRandyWinner, sendRandyDM } from '@/lib/randy'
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
    const sendDM = (settingsMap.randy_send_dm || 'true') === 'true'
    const pinWinnerMessage = (settingsMap.randy_pin_winner_message || 'true') === 'true'
    const groupTemplate = settingsMap.randy_group_template || ''
    const dmTemplate = settingsMap.randy_dm_template || ''

    // Kazananları duyur ve DM gönder
    let announcedCount = 0
    let dmSentCount = 0

    for (const result of results) {
      if (result.assigned && result.winner && result.prizeText && botToken) {
        // Grup duyurusu gönder
        if (sendAnnouncement && activityGroupId) {
          const success = await announceRandyWinner(
            botToken,
            Number(activityGroupId),
            result.winner,
            result.prizeText,
            pinWinnerMessage,
            groupTemplate || undefined
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

        // DM gönder (sadece /start yapmış kullanıcılara)
        if (sendDM) {
          const dmSuccess = await sendRandyDM(
            botToken,
            result.winner,
            result.prizeText,
            dmTemplate || undefined
          )

          if (dmSuccess) {
            dmSentCount++

            // Slot'u güncelle - DM gönderildi olarak işaretle
            if (result.slotId) {
              await prisma.randySlot.update({
                where: { id: result.slotId },
                data: { dmSent: true }
              })
            }
          }
        }
      }
    }

    console.log(`📢 ${announcedCount} kazanan grupta duyuruldu`)
    console.log(`💬 ${dmSentCount} kazanana DM gönderildi`)

    return NextResponse.json({
      success: true,
      message: 'Randy check completed',
      slotsChecked: results.length,
      winnersAnnounced: announcedCount,
      dmsSent: dmSentCount
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
