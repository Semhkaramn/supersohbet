import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        rank: true,
        purchases: {
          include: {
            item: true
          },
          orderBy: { purchasedAt: 'desc' }
        },
        wheelSpins: {
          include: {
            prize: true
          },
          orderBy: { spunAt: 'desc' }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Get user detail error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { points, xp, dailySpinsLeft } = body

    const updateData: {
      points?: number;
      xp?: number;
      dailySpinsLeft?: number;
    } = {}
    if (typeof points === 'number') updateData.points = points
    if (typeof xp === 'number') updateData.xp = xp
    if (typeof dailySpinsLeft === 'number') updateData.dailySpinsLeft = dailySpinsLeft

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      include: { rank: true }
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.user.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
