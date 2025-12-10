import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { requireAuth } from '@/lib/auth'

// Çark artık tamamen ücretsiz

export async function POST(request: NextRequest) {
  try {
    // Session kontrolü - artık body'den userId yerine session kullanıyoruz
    const session = await requireAuth(request)
    const userId = session.userId

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    // Kullanıcıyı getir
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Günlük çevirme hakkı kontrolü
    if (user.dailySpinsLeft <= 0) {
      return NextResponse.json(
        { error: 'No spins left today' },
        { status: 400 }
      )
    }

    // Aktif ödülleri getir (Frontend ile aynı sırada olmalı!)
    const prizes = await prisma.wheelPrize.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' }
    })

    if (prizes.length === 0) {
      return NextResponse.json(
        { error: 'No prizes available' },
        { status: 400 }
      )
    }

    // Prize listesi hazır
    console.log(`🎯 Çark: ${prizes.length} ödül var`)

    // Rastgele ödül seç (probability'ye göre ağırlıklı)
    const totalProbability = prizes.reduce((sum: number, prize) => sum + prize.probability, 0)
    let random = Math.random() * totalProbability
    let selectedPrize = prizes[0]

    for (const prize of prizes) {
      random -= prize.probability
      if (random <= 0) {
        selectedPrize = prize
        break
      }
    }

    const selectedIndex = prizes.findIndex(p => p.id === selectedPrize.id)
    console.log(`✅ Kazanılan: ${selectedPrize.name} (${selectedPrize.points} puan)`)

    // Transaction ile işlemleri gerçekleştir
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Çark hakkını azalt ve kazanılan puanı ekle
      await tx.user.update({
        where: { id: userId },
        data: {
          dailySpinsLeft: { decrement: 1 },
          points: { increment: selectedPrize.points }
        }
      })

      // Çark çevirme kaydı oluştur
      const wheelSpin = await tx.wheelSpin.create({
        data: {
          userId,
          prizeId: selectedPrize.id,
          pointsWon: selectedPrize.points
        }
      })

      // Puan geçmişi kaydı oluştur
      await tx.pointHistory.create({
        data: {
          userId,
          amount: selectedPrize.points,
          type: 'wheel_win',
          description: `Çarktan ${selectedPrize.name} kazanıldı`,
          relatedId: wheelSpin.id
        }
      })
    })

    return NextResponse.json({
      success: true,
      prizeId: selectedPrize.id,
      pointsWon: selectedPrize.points,
      prizeName: selectedPrize.name,
      prizeIndex: selectedIndex
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Oturum geçersiz. Lütfen tekrar giriş yapın.' },
        { status: 401 }
      )
    }
    console.error('Wheel spin error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
