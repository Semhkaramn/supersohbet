import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PUT - Görevi güncelle
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      title,
      description,
      type,
      xpReward,
      pointsReward,
      requirement,
      isActive,
      order
    } = body

    const task = await prisma.task.update({
      where: { id },
      data: {
        title,
        description,
        type,
        xpReward: parseInt(xpReward) || 0,
        pointsReward: parseInt(pointsReward) || 0,
        requirement: parseInt(requirement) || 1,
        isActive,
        order: parseInt(order) || 0
      }
    })

    return NextResponse.json(task)
  } catch (error) {
    console.error('Update task error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Görevi sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.task.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete task error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
