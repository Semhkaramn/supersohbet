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

    // Kullanıcıyı getir (referral sayısı ve diğer istatistikler için)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        totalReferrals: true,
        messageCount: true,
        points: true,
        xp: true,
        rank: {
          select: {
            minXp: true,
            order: true
          }
        },
        wheelSpins: {
          select: { id: true }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const now = new Date()

    // Tüm aktif görevleri getir (süresi dolmamış olanlar)
    const allTasks = await prisma.task.findMany({
      where: {
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gte: now } }
        ]
      },
      orderBy: [
        { category: 'asc' },
        { order: 'asc' }
      ]
    })

    // Kullanıcının görev tamamlama kayıtlarını getir
    const completions = await prisma.taskCompletion.findMany({
      where: { userId }
    })

    const completionMap = new Map(
      completions.map(c => [c.taskId, c])
    )

    // Kullanıcının güncel istatistiklerine göre görev ilerlemesini hesapla
    function calculateProgress(task: any) {
      let currentProgress = 0

      switch (task.taskType) {
        case 'invite_users':
          currentProgress = user.totalReferrals || 0
          break
        case 'send_messages':
          currentProgress = user.messageCount || 0
          break
        case 'spin_wheel':
          currentProgress = user.wheelSpins?.length || 0
          break
        case 'earn_points':
          currentProgress = user.points || 0
          break
        case 'reach_level':
          currentProgress = user.rank?.order || 0
          break
        default:
          const completion = completionMap.get(task.id)
          currentProgress = completion?.currentProgress || 0
      }

      return currentProgress
    }

    // Görevleri kategorilere ayır ve formatla
    const formatTask = (task: any) => {
      const completion = completionMap.get(task.id)
      const currentProgress = calculateProgress(task)
      const isCompleted = completion?.isCompleted || currentProgress >= task.targetValue

      return {
        id: task.id,
        title: task.title,
        description: task.description,
        category: task.category,
        taskType: task.taskType,
        targetValue: task.targetValue,
        currentProgress,
        xpReward: task.xpReward,
        pointsReward: task.pointsReward,
        duration: task.duration,
        expiresAt: task.expiresAt,
        progress: `${Math.min(currentProgress, task.targetValue)}/${task.targetValue}`,
        completed: isCompleted,
        rewardClaimed: completion?.rewardClaimed || false
      }
    }

    const dailyTasks = allTasks
      .filter(t => t.category === 'daily')
      .map(formatTask)

    const weeklyTasks = allTasks
      .filter(t => t.category === 'weekly')
      .map(formatTask)

    const permanentTasks = allTasks
      .filter(t => t.category === 'permanent')
      .map(formatTask)

    return NextResponse.json({
      dailyTasks,
      weeklyTasks,
      permanentTasks
    })
  } catch (error) {
    console.error('Get tasks error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Görev ödülünü talep et
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, taskId } = body

    if (!userId || !taskId) {
      return NextResponse.json(
        { error: 'userId and taskId required' },
        { status: 400 }
      )
    }

    // Görevi getir
    const task = await prisma.task.findUnique({
      where: { id: taskId }
    })

    if (!task || !task.isActive) {
      return NextResponse.json(
        { error: 'Task not found or inactive' },
        { status: 404 }
      )
    }

    // Kullanıcıyı ve ilerlemesini kontrol et
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        totalReferrals: true,
        messageCount: true,
        points: true,
        xp: true,
        rank: {
          select: {
            order: true
          }
        },
        wheelSpins: {
          select: { id: true }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // İlerlemeyi hesapla
    let currentProgress = 0
    switch (task.taskType) {
      case 'invite_users':
        currentProgress = user.totalReferrals
        break
      case 'send_messages':
        currentProgress = user.messageCount
        break
      case 'spin_wheel':
        currentProgress = user.wheelSpins.length
        break
      case 'earn_points':
        currentProgress = user.points
        break
      case 'reach_level':
        currentProgress = user.rank?.order || 0
        break
    }

    // Hedef tamamlanmış mı kontrol et
    if (currentProgress < task.targetValue) {
      return NextResponse.json(
        { error: 'Task not completed yet', currentProgress, targetValue: task.targetValue },
        { status: 400 }
      )
    }

    // Daha önce ödül alınmış mı kontrol et
    const existingCompletion = await prisma.taskCompletion.findUnique({
      where: {
        userId_taskId: {
          userId,
          taskId
        }
      }
    })

    if (existingCompletion?.rewardClaimed) {
      return NextResponse.json(
        { error: 'Reward already claimed' },
        { status: 400 }
      )
    }

    // Ödülü ver ve görev tamamlamasını kaydet
    const result = await prisma.$transaction(async (tx) => {
      // Kullanıcıya ödül ver
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          points: { increment: task.pointsReward },
          xp: { increment: task.xpReward }
        }
      })

      // Görev tamamlamasını kaydet veya güncelle
      const completion = await tx.taskCompletion.upsert({
        where: {
          userId_taskId: {
            userId,
            taskId
          }
        },
        create: {
          userId,
          taskId,
          currentProgress,
          targetProgress: task.targetValue,
          isCompleted: true,
          rewardClaimed: true,
          completedAt: new Date(),
          claimedAt: new Date()
        },
        update: {
          currentProgress,
          isCompleted: true,
          rewardClaimed: true,
          completedAt: new Date(),
          claimedAt: new Date()
        }
      })

      // Puan geçmişi kaydı oluştur
      await tx.pointHistory.create({
        data: {
          userId,
          amount: task.pointsReward,
          type: 'task_reward',
          description: `"${task.title}" görevi tamamlandı`,
          relatedId: taskId
        }
      })

      return { updatedUser, completion }
    })

    return NextResponse.json({
      success: true,
      rewards: {
        points: task.pointsReward,
        xp: task.xpReward
      },
      newTotals: {
        points: result.updatedUser.points,
        xp: result.updatedUser.xp
      }
    })
  } catch (error) {
    console.error('Claim task reward error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
