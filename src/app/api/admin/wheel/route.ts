import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const prizes = await prisma.wheelPrize.findMany({
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: { wheelSpins: true }
        }
      }
    })

    return NextResponse.json({ prizes })
  } catch (error) {
    console.error('Get wheel prizes error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, points, probability, color, order } = body

    if (!name || typeof points !== 'number') {
      return NextResponse.json(
        { error: 'name and points required' },
        { status: 400 }
      )
    }

    const prize = await prisma.wheelPrize.create({
      data: {
        name,
        points,
        probability: probability || 1.0,
        color: color || '#FF6B6B',
        order: order || 0
      }
    })

    return NextResponse.json({ prize })
  } catch (error) {
    console.error('Create wheel prize error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
