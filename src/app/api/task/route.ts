import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId required' },
        { status: 400 }
      )
    }

    // Tüm aktif görevleri getir
    const dailyTasks = await prisma.task.findMany({
      where: {
        type: 'daily',
        isActive: true
      },
      orderBy: { order: 'asc' }
    })

    const weeklyTasks = await prisma.task.findMany({
      where: {
        type: 'weekly',
        isActive: true
      },
      orderBy: { order: 'asc' }
    })

    // Kullanıcının tamamladığı görevleri getir
    const completions = await prisma.taskCompletion.findMany({
      where: { userId }
    })

    const completionMap = new Map(
      completions.map(c => [c.taskId, c])
    )

    // Görevleri formatlayıp tamamlanma durumlarını ekle
    const formattedDailyTasks = dailyTasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      reward: task.xpReward,
      pointsReward: task.pointsReward,
      progress: completionMap.get(task.id)
        ? `${completionMap.get(task.id)!.progress}/${task.requirement}`
        : `0/${task.requirement}`,
      completed: completionMap.has(task.id) &&
                 completionMap.get(task.id)!.progress >= task.requirement
    }))

    const formattedWeeklyTasks = weeklyTasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      reward: task.xpReward,
      pointsReward: task.pointsReward,
      progress: completionMap.get(task.id)
        ? `${completionMap.get(task.id)!.progress}/${task.requirement}`
        : `0/${task.requirement}`,
      completed: completionMap.has(task.id) &&
                 completionMap.get(task.id)!.progress >= task.requirement
    }))

    return NextResponse.json({
      dailyTasks: formattedDailyTasks,
      weeklyTasks: formattedWeeklyTasks
    })
  } catch (error) {
    console.error('Get tasks error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
