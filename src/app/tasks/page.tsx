'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import BottomNav from '@/components/BottomNav'
import { FileText, CheckCircle2, Clock, Zap, Users, Gift } from 'lucide-react'

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
  const [referralCount, setReferralCount] = useState(0)
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
      const [tasksRes, referralRes] = await Promise.all([
        fetch(`/api/task?userId=${userId}`),
        fetch(`/api/referral/info?userId=${userId}`)
      ])
      const tasksData = await tasksRes.json()
      const referralData = await referralRes.json()

      setDailyTasks(tasksData.dailyTasks || [])
      setWeeklyTasks(tasksData.weeklyTasks || [])
      setReferralCount(referralData.totalReferrals || 0)
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
      <div className="bg-gradient-to-br from-indigo-600 to-blue-600 p-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Görevler
          </h1>
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

        {/* Referral Tasks */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-orange-400" />
            <h2 className="text-xl font-bold text-white">Referans Görevleri</h2>
          </div>
          <div className="space-y-3">
            {/* 1 Kişi Davet Et */}
            <Card className={`bg-gradient-to-br ${referralCount >= 1 ? 'from-green-500/10 to-emerald-500/10 border-green-500/30' : 'from-orange-500/10 to-red-500/10 border-orange-500/30'} p-4`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  {referralCount >= 1 ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
                  ) : (
                    <Users className="w-6 h-6 text-orange-400 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">1 Arkadaş Davet Et</h3>
                    <p className="text-sm text-gray-400">İlerleme: {referralCount}/1</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge className={referralCount >= 1 ? "bg-green-500/20 text-green-300 border-green-500/30" : "bg-orange-500/20 text-orange-300 border-orange-500/30"}>
                    <Gift className="w-3 h-3 mr-1" />
                    +100 puan
                  </Badge>
                </div>
              </div>
            </Card>

            {/* 5 Kişi Davet Et */}
            <Card className={`bg-gradient-to-br ${referralCount >= 5 ? 'from-green-500/10 to-emerald-500/10 border-green-500/30' : 'from-orange-500/10 to-red-500/10 border-orange-500/30'} p-4`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  {referralCount >= 5 ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
                  ) : (
                    <Users className="w-6 h-6 text-orange-400 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">5 Arkadaş Davet Et</h3>
                    <p className="text-sm text-gray-400">İlerleme: {referralCount}/5</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge className={referralCount >= 5 ? "bg-green-500/20 text-green-300 border-green-500/30" : "bg-orange-500/20 text-orange-300 border-orange-500/30"}>
                    <Gift className="w-3 h-3 mr-1" />
                    +500 puan
                  </Badge>
                </div>
              </div>
            </Card>

            {/* 10 Kişi Davet Et */}
            <Card className={`bg-gradient-to-br ${referralCount >= 10 ? 'from-green-500/10 to-emerald-500/10 border-green-500/30' : 'from-orange-500/10 to-red-500/10 border-orange-500/30'} p-4`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  {referralCount >= 10 ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
                  ) : (
                    <Users className="w-6 h-6 text-orange-400 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">10 Arkadaş Davet Et</h3>
                    <p className="text-sm text-gray-400">İlerleme: {referralCount}/10</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge className={referralCount >= 10 ? "bg-green-500/20 text-green-300 border-green-500/30" : "bg-orange-500/20 text-orange-300 border-orange-500/30"}>
                    <Gift className="w-3 h-3 mr-1" />
                    +1000 puan
                  </Badge>
                </div>
              </div>
            </Card>

            {/* 25 Kişi Davet Et */}
            <Card className={`bg-gradient-to-br ${referralCount >= 25 ? 'from-green-500/10 to-emerald-500/10 border-green-500/30' : 'from-orange-500/10 to-red-500/10 border-orange-500/30'} p-4`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  {referralCount >= 25 ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
                  ) : (
                    <Users className="w-6 h-6 text-orange-400 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">25 Arkadaş Davet Et</h3>
                    <p className="text-sm text-gray-400">İlerleme: {referralCount}/25</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge className={referralCount >= 25 ? "bg-green-500/20 text-green-300 border-green-500/30" : "bg-orange-500/20 text-orange-300 border-orange-500/30"}>
                    <Gift className="w-3 h-3 mr-1" />
                    +3000 puan
                  </Badge>
                </div>
              </div>
            </Card>

            {/* 50 Kişi Davet Et */}
            <Card className={`bg-gradient-to-br ${referralCount >= 50 ? 'from-green-500/10 to-emerald-500/10 border-green-500/30' : 'from-orange-500/10 to-red-500/10 border-orange-500/30'} p-4`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  {referralCount >= 50 ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
                  ) : (
                    <Users className="w-6 h-6 text-orange-400 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">50 Arkadaş Davet Et</h3>
                    <p className="text-sm text-gray-400">İlerleme: {referralCount}/50</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge className={referralCount >= 50 ? "bg-green-500/20 text-green-300 border-green-500/30" : "bg-orange-500/20 text-orange-300 border-orange-500/30"}>
                    <Gift className="w-3 h-3 mr-1" />
                    +7500 puan
                  </Badge>
                </div>
              </div>
            </Card>
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
