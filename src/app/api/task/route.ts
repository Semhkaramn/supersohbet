import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTurkeyDate } from '@/lib/utils'
import { requireAuth } from '@/lib/auth'
import { invalidateLeaderboardCache } from '@/lib/cache'

export async function GET(request: NextRequest) {
  try {
    // Session kontrolü - artık opsiyonel (giriş yapmadan da görevleri görebilmeli)
    let userId: string | null = null
    try {
      const session = await requireAuth(request)
      userId = session.userId
    } catch (error) {
      // Giriş yapmamış - görevleri gösterebiliriz ama progress 0 olacak
      console.log('User not authenticated, showing tasks without progress')
    }

    // Kullanıcı yoksa default değerlerle devam et
    let user: any = null
    if (userId) {
      user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          messageCount: true,
          totalMessages: true,
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
    }

    const now = getTurkeyDate() // Türkiye saati

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

    // Kullanıcının görev tamamlama kayıtlarını getir (sadece giriş yapmışsa)
    const completions = userId ? await prisma.taskCompletion.findMany({
      where: { userId }
    }) : []

    const completionMap = new Map(
      completions.map(c => [c.taskId, c])
    )

    // Yeni görevler için TaskCompletion kayıtları oluştur (sadece giriş yapmışsa)
    if (userId && user) {
      for (const task of allTasks) {
        if (!completionMap.has(task.id)) {
          // Kullanıcının şu anki değerini al (başlangıç değeri olarak)
          let startingValue = 0
          switch (task.taskType) {
            case 'send_messages':
              startingValue = user.totalMessages || 0
              break
            case 'spin_wheel':
              startingValue = user.wheelSpins?.length || 0
              break
            case 'earn_points':
              startingValue = user.points || 0
              break
            case 'reach_level':
              startingValue = user.rank?.order || 0
              break
          }

          // TaskCompletion kaydı oluştur
          const newCompletion = await prisma.taskCompletion.create({
            data: {
              userId,
              taskId: task.id,
              targetProgress: task.targetValue,
              startingValue, // Başlangıç değerini kaydet
              expiresAt: task.expiresAt
            }
          })

          completionMap.set(task.id, newCompletion)
        }
      }
    }

    // Her görev için kullanıcının kaç kez tamamladığını hesapla (sadece giriş yapmışsa)
    const completionCountsPromises = userId ? allTasks.map(async (task) => {
      const count = await prisma.taskCompletion.count({
        where: {
          userId,
          taskId: task.id,
          rewardClaimed: true
        }
      })
      return [task.id, count] as const
    }) : []

    const completionCounts = await Promise.all(completionCountsPromises)
    const completionCountMap = new Map(completionCounts)

    // Kullanıcının güncel istatistiklerine göre görev ilerlemesini hesapla
    function calculateProgress(task: any, userData: typeof user) {
      let currentValue = 0

      // Kullanıcı yoksa progress 0
      if (!userData) {
        return 0
      }

      // Kullanıcının şu anki değerini al
      switch (task.taskType) {
        case 'send_messages':
          // NOT: totalMessages kullanılıyor - TÜM mesajlar (ödül almasa bile)
          currentValue = userData.totalMessages || 0
          break
        case 'spin_wheel':
          currentValue = userData.wheelSpins?.length || 0
          break
        case 'earn_points':
          currentValue = userData.points || 0
          break
        case 'reach_level':
          currentValue = userData.rank?.order || 0
          break
        default:
          const completion = completionMap.get(task.id)
          return completion?.currentProgress || 0
      }

      // TaskCompletion kaydını kontrol et - startingValue varsa kullan
      const completion = completionMap.get(task.id)
      const startingValue = completion?.startingValue || 0

      // İlerleme = şu anki değer - başlangıç değeri
      // Bu sayede sadece görev oluşturulduktan SONRA yapılan aktiviteler sayılır
      return Math.max(0, currentValue - startingValue)
    }

    // Görevleri kategorilere ayır ve formatla
    const formatTask = (task: any) => {
      const completion = completionMap.get(task.id)
      const currentProgress = calculateProgress(task, user)
      const isCompleted = completion?.isCompleted || currentProgress >= task.targetValue
      const userCompletionCount = completionCountMap.get(task.id) || 0

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
        completionLimit: task.completionLimit,
        userCompletionCount,
        remainingAttempts: task.completionLimit !== null
          ? Math.max(0, task.completionLimit - userCompletionCount)
          : null,
        progress: `${Math.min(currentProgress, task.targetValue)}/${task.targetValue}`,
        completed: isCompleted,
        rewardClaimed: completion?.rewardClaimed || false
      }
    }

    // Aktif görevleri filtrele (tamamlanmamış veya tekrar yapılabilir olanlar)
    const filterActiveTasks = (tasks: any[]) => {
      return tasks.filter(task => {
        const completion = completionMap.get(task.id)
        const currentProgress = calculateProgress(task, user)
        const isCompleted = completion?.isCompleted || currentProgress >= task.targetValue
        const userCompletionCount = completionCountMap.get(task.id) || 0

        // Görev tamamlanmamışsa göster
        if (!isCompleted || !completion?.rewardClaimed) {
          return true
        }

        // Completion limit varsa ve henüz tamamlanmadıysa göster
        if (task.completionLimit !== null && userCompletionCount < task.completionLimit) {
          return true
        }

        // Completion limit yoksa (sınırsız) gösterme (geçmişe taşı)
        return false
      })
    }

    const dailyTasks = filterActiveTasks(
      allTasks.filter(t => t.category === 'daily')
    ).map(formatTask)

    const weeklyTasks = filterActiveTasks(
      allTasks.filter(t => t.category === 'weekly')
    ).map(formatTask)

    const permanentTasks = filterActiveTasks(
      allTasks.filter(t => t.category === 'permanent')
    ).map(formatTask)

    // Görev Geçmişi - Tamamlanan ve ödülü alınmış görevler (sadece giriş yapmışsa)
    const taskHistory = userId ? await prisma.taskCompletion.findMany({
      where: {
        userId,
        isCompleted: true,
        rewardClaimed: true
      },
      include: {
        task: true
      },
      orderBy: {
        claimedAt: 'desc'
      },
      take: 100 // Son 100 tamamlanmış görev
    }) : []

    const formattedHistory = taskHistory.map(completion => ({
      id: completion.id,
      taskId: completion.taskId,
      title: completion.task.title,
      description: completion.task.description,
      category: completion.task.category,
      taskType: completion.task.taskType,
      targetValue: completion.targetProgress,
      completedProgress: completion.currentProgress,
      xpReward: completion.task.xpReward,
      pointsReward: completion.task.pointsReward,
      completedAt: completion.completedAt,
      claimedAt: completion.claimedAt
    }))

    return NextResponse.json({
      dailyTasks,
      weeklyTasks,
      permanentTasks,
      taskHistory: formattedHistory,
      isAuthenticated: !!userId // Frontend için - kullanıcı giriş yapmış mı?
    })
  } catch (error) {
    // Artık Unauthorized hatası olmamalı çünkü auth opsiyonel
    // Ama beklenmeyen hatalar için hala catch yapıyoruz
    console.error('Get tasks error:', error)
    return NextResponse.json(
      { error: 'Görevler yüklenirken bir hata oluştu' },
      { status: 500 }
    )
  }
}

// POST - Görev ödülünü talep et
export async function POST(request: NextRequest) {
  try {
    // Session kontrolü - artık body'den userId yerine session kullanıyoruz
    const session = await requireAuth(request)
    const userId = session.userId

    const body = await request.json()
    const { taskId } = body

    if (!taskId) {
      return NextResponse.json(
        { error: 'taskId required' },
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
        messageCount: true,
        totalMessages: true,
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

    // TaskCompletion kaydını al (startingValue için)
    const existingCompletion = await prisma.taskCompletion.findUnique({
      where: {
        userId_taskId: {
          userId,
          taskId
        }
      }
    })

    // Kullanıcının şu anki değerini al
    let currentValue = 0
    switch (task.taskType) {
      case 'send_messages':
        currentValue = user.totalMessages
        break
      case 'spin_wheel':
        currentValue = user.wheelSpins.length
        break
      case 'earn_points':
        currentValue = user.points
        break
      case 'reach_level':
        currentValue = user.rank?.order || 0
        break
    }

    // İlerlemeyi hesapla (şu anki değer - başlangıç değeri)
    const startingValue = existingCompletion?.startingValue || 0
    const currentProgress = Math.max(0, currentValue - startingValue)

    // Hedef tamamlanmış mı kontrol et
    if (currentProgress < task.targetValue) {
      return NextResponse.json(
        { error: 'Task not completed yet', currentProgress, targetValue: task.targetValue },
        { status: 400 }
      )
    }

    // Tamamlanma limiti kontrolü
    if (task.completionLimit !== null) {
      const completionCount = await prisma.taskCompletion.count({
        where: {
          userId,
          taskId,
          rewardClaimed: true
        }
      })

      if (completionCount >= task.completionLimit) {
        return NextResponse.json(
          { error: `Bu görevi en fazla ${task.completionLimit} kez tamamlayabilirsiniz` },
          { status: 400 }
        )
      }
    }

    // Daha önce ödül alınmış mı kontrol et (existingCompletion yukarıda zaten alındı)
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
          completedAt: getTurkeyDate(),
          claimedAt: getTurkeyDate()
        },
        update: {
          currentProgress,
          isCompleted: true,
          rewardClaimed: true,
          completedAt: getTurkeyDate(),
          claimedAt: getTurkeyDate()
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

    // ✅ Puan/XP değiştiği için leaderboard cache'ini temizle
    invalidateLeaderboardCache()
    console.log('🔄 Leaderboard cache temizlendi (görev tamamlama)')

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
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Oturum geçersiz. Lütfen tekrar giriş yapın.' },
        { status: 401 }
      )
    }
    console.error('Claim task reward error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
