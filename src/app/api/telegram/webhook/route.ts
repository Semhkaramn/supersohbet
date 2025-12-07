import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const POINTS_PER_MESSAGE = 10
const XP_PER_MESSAGE = 5

export async function POST(request: NextRequest) {
  try {
    const update = await request.json()

    // Mesaj varsa işle
    if (update.message && update.message.text) {
      const message = update.message
      const userId = String(message.from.id)
      const username = message.from.username
      const firstName = message.from.first_name
      const lastName = message.from.last_name

      // Kullanıcıyı bul veya oluştur
      let user = await prisma.user.findUnique({
        where: { telegramId: userId }
      })

      if (!user) {
        user = await prisma.user.create({
          data: {
            telegramId: userId,
            username,
            firstName,
            lastName
          }
        })
      }

      // Puan ve XP ekle
      await prisma.user.update({
        where: { id: user.id },
        data: {
          points: { increment: POINTS_PER_MESSAGE },
          xp: { increment: XP_PER_MESSAGE },
          totalMessages: { increment: 1 }
        }
      })

      // Rütbe kontrolü ve güncelleme
      const currentRank = await prisma.rank.findFirst({
        where: { minXp: { lte: user.xp + XP_PER_MESSAGE } },
        orderBy: { minXp: 'desc' }
      })

      if (currentRank && user.rankId !== currentRank.id) {
        await prisma.user.update({
          where: { id: user.id },
          data: { rankId: currentRank.id }
        })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
