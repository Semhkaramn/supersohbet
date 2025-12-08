import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Sadece 4 sabit sembol
const AVAILABLE_SYMBOLS = ['7️⃣', '🍒', '🍇', '🍋']

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

    // Günlük hak kontrolü ve reset
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
      // Sonraki reset zamanını hesapla
      const nextReset = new Date(lastReset.getTime() + 24 * 60 * 60 * 1000)
      const hoursUntilReset = Math.ceil((nextReset.getTime() - now.getTime()) / (1000 * 60 * 60))

      return NextResponse.json({
        error: `Günlük hakkınız kalmadı! ${hoursUntilReset} saat sonra yenilenecek.`,
        spinsLeft: 0,
        hoursUntilReset
      }, { status: 400 })
    }

    // 3 makara için rastgele sembol seç - herhangi bir sembol gelebilir
    const reel1Symbol = AVAILABLE_SYMBOLS[Math.floor(Math.random() * AVAILABLE_SYMBOLS.length)]
    const reel2Symbol = AVAILABLE_SYMBOLS[Math.floor(Math.random() * AVAILABLE_SYMBOLS.length)]
    const reel3Symbol = AVAILABLE_SYMBOLS[Math.floor(Math.random() * AVAILABLE_SYMBOLS.length)]

    // 3'ü de aynı mı kontrol et
    const isMatch = reel1Symbol === reel2Symbol && reel2Symbol === reel3Symbol

    // Eğer 3'ü aynı ise, bu sembol için ödül var mı kontrol et
    let wonPrize = null
    let pointsWon = 0
    let prizeName = ''

    if (isMatch) {
      wonPrize = await prisma.slotMachinePrize.findFirst({
        where: {
          symbol: reel1Symbol,
          isActive: true
        }
      })

      if (wonPrize) {
        pointsWon = wonPrize.points
        prizeName = wonPrize.name
      }
    }

    // Slot çevirme kaydı oluştur
    const symbols = `${reel1Symbol} ${reel2Symbol} ${reel3Symbol}`
    await prisma.slotMachineSpin.create({
      data: {
        userId,
        prizeId: wonPrize?.id,
        symbols,
        pointsWon,
        isWin: isMatch && wonPrize !== null
      }
    })

    // Kullanıcı puanını güncelle ve spin hakkını azalt
    if (wonPrize && pointsWon > 0) {
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

    // Sonraki reset zamanını hesapla
    const nextReset = new Date(lastReset.getTime() + 24 * 60 * 60 * 1000)
    const hoursUntilReset = Math.max(0, Math.ceil((nextReset.getTime() - now.getTime()) / (1000 * 60 * 60)))

    return NextResponse.json({
      success: true,
      isWin: wonPrize !== null && isMatch,
      symbols: [reel1Symbol, reel2Symbol, reel3Symbol],
      pointsWon,
      prizeName: prizeName || 'Tekrar Deneyin',
      spinsLeft: spinsLeft - 1,
      hoursUntilReset,
      isMatch // 3'ü aynı mı (ödül olmasa bile)
    })

  } catch (error) {
    console.error('Error spinning slot machine:', error)
    return NextResponse.json({ error: 'Çevirme işlemi başarısız' }, { status: 500 })
  }
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
