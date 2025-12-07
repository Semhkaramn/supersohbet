import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const ranks = await prisma.rank.findMany({
      orderBy: { minXp: 'asc' },
      include: {
        _count: {
          select: { users: true }
        }
      }
    })

    return NextResponse.json({ ranks })
  } catch (error) {
    console.error('Get ranks error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, minXp, icon, color, order } = body

    if (!name || typeof minXp !== 'number') {
      return NextResponse.json(
        { error: 'name and minXp required' },
        { status: 400 }
      )
    }

    const rank = await prisma.rank.create({
      data: {
        name,
        minXp,
        icon: icon || '⭐',
        color: color || '#FFD700',
        order: order || 0
      }
    })

    return NextResponse.json({ rank })
  } catch (error) {
    console.error('Create rank error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
