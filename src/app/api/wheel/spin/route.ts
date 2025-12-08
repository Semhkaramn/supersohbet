import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

// Çark artık tamamen ücretsiz

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body

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

    // DEBUG: Prize sıralamasını loglayalım
    console.log('=== BACKEND PRIZES ORDER ===')
    prizes.forEach((p, i) => {
      console.log(`Index ${i}: ${p.name} - ${p.points} puan (order: ${p.order}, prob: ${p.probability})`)
    })

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

    console.log(`=== SELECTED PRIZE ===`)
    console.log(`Prize: ${selectedPrize.name}`)
    console.log(`Points: ${selectedPrize.points} puan`)
    console.log(`Prize ID: ${selectedPrize.id}`)
    console.log(`Index in prizes array: ${selectedIndex}`)
    console.log(`Order value: ${selectedPrize.order}`)
    console.log(`Probability: ${selectedPrize.probability}`)

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
      await tx.wheelSpin.create({
        data: {
          userId,
          prizeId: selectedPrize.id,
          pointsWon: selectedPrize.points
        }
      })
    })

    return NextResponse.json({
      success: true,
      prizeId: selectedPrize.id,
      pointsWon: selectedPrize.points
    })
  } catch (error) {
    console.error('Wheel spin error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
