import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Tüm görevleri listele
export async function GET(request: NextRequest) {
  try {
    const tasks = await prisma.task.findMany({
      orderBy: [
        { category: 'asc' },
        { order: 'asc' }
      ],
      include: {
        _count: {
          select: { completions: true }
        }
      }
    })

    return NextResponse.json(tasks)
  } catch (error) {
    console.error('Get tasks error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Yeni görev oluştur
export async function POST(request: NextRequest) {
  try {
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

    const task = await prisma.task.create({
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
        isActive: isActive !== false,
        order: parseInt(order) || 0
      }
    })

    return NextResponse.json(task)
  } catch (error) {
    console.error('Create task error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
