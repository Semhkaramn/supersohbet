import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Tüm slot makinesi ödüllerini getir
export async function GET() {
  try {
    const prizes = await prisma.slotMachinePrize.findMany({
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: { slotSpins: true }
        }
      }
    })

    return NextResponse.json({ prizes })
  } catch (error) {
    console.error('Error fetching slot machine prizes:', error)
    return NextResponse.json({ error: 'Ödüller getirilemedi' }, { status: 500 })
  }
}

// POST - Yeni ödül ekle
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, symbol, points, chance, color, order } = body

    const prize = await prisma.slotMachinePrize.create({
      data: {
        name,
        symbol,
        points,
        chance: parseFloat(chance),
        color,
        order
      }
    })

    return NextResponse.json({ success: true, prize })
  } catch (error) {
    console.error('Error creating slot machine prize:', error)
    return NextResponse.json({ error: 'Ödül oluşturulamadı' }, { status: 500 })
  }
}
