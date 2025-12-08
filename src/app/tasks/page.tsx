'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import BottomNav from '@/components/BottomNav'
import { FileText, CheckCircle2, Clock, Zap, Users, Gift, Target, MessageSquare, Award, TrendingUp, Calendar } from 'lucide-react'
import { toast } from 'sonner'

interface Task {
  id: string
  title: string
  description?: string
  category: string
  taskType: string
  targetValue: number
  currentProgress: number
  xpReward: number
  pointsReward: number
  progress: string
  completed: boolean
  rewardClaimed: boolean
}

const TASK_TYPE_ICONS: Record<string, any> = {
  invite_users: Users,
  send_messages: MessageSquare,
  spin_wheel: Target,
  earn_points: Award,
  reach_level: TrendingUp
}

const TASK_TYPE_LABELS: Record<string, string> = {
  invite_users: 'Üye Davet',
  send_messages: 'Mesaj Gönder',
  spin_wheel: 'Çark Çevir',
  earn_points: 'Puan Kazan',
  reach_level: 'Seviye Ulaş'
}

function TasksContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const userId = searchParams.get('userId')

  const [dailyTasks, setDailyTasks] = useState<Task[]>([])
  const [weeklyTasks, setWeeklyTasks] = useState<Task[]>([])
  const [permanentTasks, setPermanentTasks] = useState<Task[]>([])
  const [referralCount, setReferralCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState<string | null>(null)

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
      setPermanentTasks(tasksData.permanentTasks || [])
      setReferralCount(referralData.totalReferrals || 0)
    } catch (error) {
      console.error('Error loading tasks:', error)
      toast.error('Görevler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  async function claimReward(taskId: string) {
    if (!userId) return

    setClaiming(taskId)
    try {
      const response = await fetch('/api/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, taskId })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast.success(`Ödül alındı! +${data.rewards.points} puan, +${data.rewards.xp} XP`)
        // Görevleri yeniden yükle
        await loadTasks()
      } else {
        toast.error(data.error || 'Ödül alınamadı')
      }
    } catch (error) {
      console.error('Error claiming reward:', error)
      toast.error('Bir hata oluştu')
    } finally {
      setClaiming(null)
    }
  }

  function TaskCard({ task }: { task: Task }) {
    const Icon = TASK_TYPE_ICONS[task.taskType] || FileText
    const canClaim = task.completed && !task.rewardClaimed

    return (
      <Card className={`bg-gradient-to-br ${
        task.rewardClaimed
          ? 'from-gray-500/10 to-gray-600/10 border-gray-500/30'
          : canClaim
            ? 'from-green-500/10 to-emerald-500/10 border-green-500/30'
            : 'from-blue-500/10 to-purple-500/10 border-blue-500/30'
      } p-4`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div className={`p-2 rounded-lg ${
              task.rewardClaimed
                ? 'bg-gray-500/20'
                : canClaim
                  ? 'bg-green-500/20'
                  : 'bg-blue-500/20'
            }`}>
              {task.rewardClaimed ? (
                <CheckCircle2 className="w-6 h-6 text-gray-400" />
              ) : canClaim ? (
                <CheckCircle2 className="w-6 h-6 text-green-400" />
              ) : (
                <Icon className="w-6 h-6 text-blue-400" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="font-semibold text-white text-sm">{task.title}</h3>
              </div>

              {task.description && (
                <p className="text-xs text-gray-400 mb-2">{task.description}</p>
              )}

              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-400">{TASK_TYPE_LABELS[task.taskType] || task.taskType}</span>
                <span className="text-xs text-gray-500">•</span>
                <span className="text-xs text-gray-300">{task.progress}</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-white/10 rounded-full h-2 mb-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    task.rewardClaimed
                      ? 'bg-gray-400'
                      : canClaim
                        ? 'bg-green-500'
                        : 'bg-blue-500'
                  }`}
                  style={{
                    width: `${Math.min((task.currentProgress / task.targetValue) * 100, 100)}%`
                  }}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {task.xpReward > 0 && (
                  <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-300 border-yellow-500/30">
                    ⭐ {task.xpReward} XP
                  </Badge>
                )}
                {task.pointsReward > 0 && (
                  <Badge variant="outline" className="text-xs bg-green-500/10 text-green-300 border-green-500/30">
                    💰 {task.pointsReward} Puan
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {canClaim && (
            <Button
              onClick={() => claimReward(task.id)}
              disabled={claiming === task.id}
              size="sm"
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shrink-0"
            >
              {claiming === task.id ? 'Alınıyor...' : 'Al'}
            </Button>
          )}
        </div>
      </Card>
    )
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
          <p className="text-sm text-blue-100 mt-1">Görevleri tamamla, ödül kazan!</p>
        </div>
      </div>

      {/* Tasks List */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        {/* Daily Tasks */}
        {dailyTasks.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-cyan-400" />
              <h2 className="text-xl font-bold text-white">Günlük Görevler</h2>
              <Badge variant="outline" className="ml-auto text-xs bg-cyan-500/10 text-cyan-300 border-cyan-500/30">
                {dailyTasks.filter(t => t.completed && !t.rewardClaimed).length} ödül bekliyor
              </Badge>
            </div>
            <div className="space-y-3">
              {dailyTasks.map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </div>
        )}

        {/* Weekly Tasks */}
        {weeklyTasks.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-teal-400" />
              <h2 className="text-xl font-bold text-white">Haftalık Görevler</h2>
              <Badge variant="outline" className="ml-auto text-xs bg-teal-500/10 text-teal-300 border-teal-500/30">
                {weeklyTasks.filter(t => t.completed && !t.rewardClaimed).length} ödül bekliyor
              </Badge>
            </div>
            <div className="space-y-3">
              {weeklyTasks.map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </div>
        )}

        {/* Permanent Tasks */}
        {permanentTasks.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-purple-400" />
              <h2 className="text-xl font-bold text-white">Kalıcı Görevler</h2>
              <Badge variant="outline" className="ml-auto text-xs bg-purple-500/10 text-purple-300 border-purple-500/30">
                {permanentTasks.filter(t => t.completed && !t.rewardClaimed).length} ödül bekliyor
              </Badge>
            </div>
            <div className="space-y-3">
              {permanentTasks.map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {dailyTasks.length === 0 && weeklyTasks.length === 0 && permanentTasks.length === 0 && (
          <Card className="bg-white/5 border-white/10 p-8 text-center">
            <FileText className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Henüz Görev Yok</h3>
            <p className="text-gray-400">Yakında yeni görevler eklenecek!</p>
          </Card>
        )}

        {/* Info Card */}
        <Card className="bg-blue-500/10 border-blue-500/30 p-4">
          <div className="flex items-start gap-3">
            <Gift className="w-5 h-5 text-blue-300 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-200">
              <p className="font-semibold mb-1">Görev Sistemi Nasıl Çalışır?</p>
              <ul className="space-y-1 text-xs">
                <li>• Görevleri tamamlayın ve ödül kazanın</li>
                <li>• Günlük görevler her gün, haftalık görevler her hafta sıfırlanır</li>
                <li>• Kalıcı görevler bir kez tamamlanabilir</li>
                <li>• Tamamlanan görevlerin ödüllerini "Al" butonuyla talep edin</li>
              </ul>
            </div>
          </div>
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
