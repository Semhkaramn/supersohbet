'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import BottomNav from '@/components/BottomNav'
import { FileText, CheckCircle2, Clock, Zap } from 'lucide-react'

export default function TasksPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const userId = searchParams.get('userId')

  useEffect(() => {
    if (!userId) {
      router.push('/')
    }
  }, [userId])

  const dailyTasks = [
    { id: 1, title: 'Günlük Giriş', reward: 50, completed: true },
    { id: 2, title: '10 Mesaj Gönder', reward: 100, progress: '7/10', completed: false },
    { id: 3, title: 'Çark Çevir', reward: 250, completed: false },
  ]

  const weeklyTasks = [
    { id: 4, title: 'Haftalık Aktif Katılım', reward: 500, progress: '3/7 gün', completed: false },
    { id: 5, title: '50 Mesaj Gönder', reward: 300, progress: '32/50', completed: false },
  ]

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
        </div>

        {/* Weekly Tasks */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-purple-400" />
            <h2 className="text-xl font-bold text-white">Haftalık Görevler</h2>
          </div>
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
