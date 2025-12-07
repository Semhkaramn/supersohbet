'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import BottomNav from '@/components/BottomNav'
import { FileText, CheckCircle2, Clock, Zap } from 'lucide-react'

interface Task {
  id: string
  title: string
  reward: number
  progress?: string
  completed: boolean
}

function TasksContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const userId = searchParams.get('userId')

  const [dailyTasks, setDailyTasks] = useState<Task[]>([])
  const [weeklyTasks, setWeeklyTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      router.push('/')
      return
    }
    loadTasks()
  }, [userId])

  async function loadTasks() {
    try {
      const response = await fetch(`/api/tasks?userId=${userId}`)
      const data = await response.json()
      setDailyTasks(data.dailyTasks || [])
      setWeeklyTasks(data.weeklyTasks || [])
    } catch (error) {
      console.error('Error loading tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300">Görevler yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 to-blue-600 p-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-white flex items-center gap-2 mb-2">
            <FileText className="w-8 h-8" />
            Görevler
          </h1>
          <p className="text-white/80">Görevleri tamamla, ödül kazan!</p>
        </div>
      </div>

      {/* Tasks List */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Daily Tasks */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-yellow-400" />
            <h2 className="text-xl font-bold text-white">Günlük Görevler</h2>
          </div>
          {dailyTasks.length === 0 ? (
            <Card className="bg-white/5 border-white/10 p-6 text-center">
              <Clock className="w-12 h-12 text-gray-500 mx-auto mb-3" />
              <p className="text-gray-400">Henüz günlük görev bulunmuyor</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {dailyTasks.map(task => (
                <Card key={task.id} className="bg-white/5 border-white/10 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      {task.completed ? (
                        <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
                      ) : (
                        <Clock className="w-6 h-6 text-blue-400 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-white">{task.title}</h3>
                        {task.progress && (
                          <p className="text-sm text-gray-400">{task.progress}</p>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant={task.completed ? "outline" : "default"}
                      className={task.completed ? "text-green-400 border-green-400" : "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"}
                    >
                      +{task.reward} XP
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Weekly Tasks */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-purple-400" />
            <h2 className="text-xl font-bold text-white">Haftalık Görevler</h2>
          </div>
          {weeklyTasks.length === 0 ? (
            <Card className="bg-white/5 border-white/10 p-6 text-center">
              <Clock className="w-12 h-12 text-gray-500 mx-auto mb-3" />
              <p className="text-gray-400">Henüz haftalık görev bulunmuyor</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {weeklyTasks.map(task => (
                <Card key={task.id} className="bg-white/5 border-white/10 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      {task.completed ? (
                        <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
                      ) : (
                        <Clock className="w-6 h-6 text-purple-400 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-white">{task.title}</h3>
                        {task.progress && (
                          <p className="text-sm text-gray-400">{task.progress}</p>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant={task.completed ? "outline" : "default"}
                      className={task.completed ? "text-green-400 border-green-400" : "bg-purple-500/20 text-purple-300 border-purple-500/30"}
                    >
                      +{task.reward} XP
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Info Card */}
        <Card className="bg-blue-500/10 border-blue-500/30 p-4 mt-6">
          <p className="text-blue-200 text-sm text-center">
            💡 Her gün yeni görevler yayınlanır. Görevleri tamamlayarak XP ve puan kazanabilirsin!
          </p>
        </Card>
      </div>

      <BottomNav userId={userId!} />
    </div>
  )
}

export default function TasksPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <TasksContent />
    </Suspense>
  )
}
