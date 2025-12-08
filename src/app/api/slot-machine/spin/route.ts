import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'Kullanıcı ID gerekli' }, { status: 400 })
    }

    // Kullanıcıyı kontrol et
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
    }

    // Günlük hak kontrolü
    const now = new Date()
    const lastReset = new Date(user.lastSlotSpinReset)
    const hoursSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60)

    let spinsLeft = user.dailySlotSpinsLeft

    // 24 saat geçtiyse hakkı sıfırla
    if (hoursSinceReset >= 24) {
      spinsLeft = 3
      await prisma.user.update({
        where: { id: userId },
        data: {
          dailySlotSpinsLeft: 3,
          lastSlotSpinReset: now
        }
      })
    }

    if (spinsLeft <= 0) {
      return NextResponse.json({
        error: 'Günlük slot makinesi hakkınız kalmadı!',
        spinsLeft: 0
      }, { status: 400 })
    }

    // Aktif ödülleri getir
    const prizes = await prisma.slotMachinePrize.findMany({
      where: {
        isActive: true,
        chance: { gt: 0 } // Şansı 0'dan büyük olanlar
      }
    })

    if (prizes.length === 0) {
      return NextResponse.json({ error: 'Aktif ödül bulunamadı' }, { status: 400 })
    }

    // 3 makara için rastgele seçim yap (ağırlıklı)
    const reel1 = selectWeightedRandom(prizes)
    const reel2 = selectWeightedRandom(prizes)
    const reel3 = selectWeightedRandom(prizes)

    // Kazanma kontrolü - 3'ü de aynı mı?
    const isWin = reel1.symbol === reel2.symbol && reel2.symbol === reel3.symbol
    const wonPrize = isWin ? reel1 : null
    const pointsWon = isWin ? wonPrize!.points : 0

    // Slot çevirme kaydı oluştur
    const symbols = `${reel1.symbol}-${reel2.symbol}-${reel3.symbol}`
    await prisma.slotMachineSpin.create({
      data: {
        userId,
        prizeId: wonPrize?.id,
        symbols,
        pointsWon,
        isWin
      }
    })

    // Kullanıcı puanını güncelle
    if (isWin && pointsWon > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          points: { increment: pointsWon },
          dailySlotSpinsLeft: { decrement: 1 }
        }
      })
    } else {
      await prisma.user.update({
        where: { id: userId },
        data: {
          dailySlotSpinsLeft: { decrement: 1 }
        }
      })
    }

    return NextResponse.json({
      success: true,
      isWin,
      symbols: [reel1.symbol, reel2.symbol, reel3.symbol],
      colors: [reel1.color, reel2.color, reel3.color],
      pointsWon,
      prizeName: wonPrize?.name,
      spinsLeft: spinsLeft - 1
    })

  } catch (error) {
    console.error('Error spinning slot machine:', error)
    return NextResponse.json({ error: 'Çevirme işlemi başarısız' }, { status: 500 })
  }
}

// Ağırlıklı rastgele seçim fonksiyonu
function selectWeightedRandom(prizes: any[]) {
  const totalChance = prizes.reduce((sum, p) => sum + p.chance, 0)
  let random = Math.random() * totalChance

  for (const prize of prizes) {
    random -= prize.chance
    if (random <= 0) {
      return prize
    }
  }

  return prizes[prizes.length - 1]
}

// Son kazananları getir
export async function GET() {
  try {
    const recentWinners = await prisma.slotMachineSpin.findMany({
      where: { isWin: true },
      take: 10,
      orderBy: { spunAt: 'desc' },
      include: {
        user: {
          select: {
            firstName: true,
            username: true
          }
        },
        prize: {
          select: {
            name: true,
            symbol: true
          }
        }
      }
    })

    return NextResponse.json({ winners: recentWinners })
  } catch (error) {
    console.error('Error fetching recent winners:', error)
    return NextResponse.json({ error: 'Kazananlar getirilemedi' }, { status: 500 })
  }
}
