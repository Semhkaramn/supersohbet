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
      category,
      taskType,
      targetValue,
      xpReward,
      pointsReward,
      duration,
      expiresAt,
      isActive,
      order
    } = body

    const task = await prisma.task.update({
      where: { id },
      data: {
        title,
        description,
        category,
        taskType,
        targetValue: parseInt(targetValue) || 1,
        xpReward: parseInt(xpReward) || 0,
        pointsReward: parseInt(pointsReward) || 0,
        duration: duration ? parseInt(duration) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
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
