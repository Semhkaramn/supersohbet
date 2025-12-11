'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import DashboardLayout from '@/components/DashboardLayout'
import { FileText, CheckCircle2, Clock, Zap, Users, Gift, Target, MessageSquare, Award, TrendingUp, Calendar, History, Sparkles, Star } from 'lucide-react'
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

interface TaskHistoryItem {
  id: string
  taskId: string
  title: string
  description?: string
  category: string
  taskType: string
  targetValue: number
  completedProgress: number
  xpReward: number
  pointsReward: number
  completedAt: string
  claimedAt: string
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
  const { user, setShowLoginModal } = useAuth()

  const [dailyTasks, setDailyTasks] = useState<Task[]>([])
  const [weeklyTasks, setWeeklyTasks] = useState<Task[]>([])
  const [permanentTasks, setPermanentTasks] = useState<Task[]>([])
  const [taskHistory, setTaskHistory] = useState<TaskHistoryItem[]>([])
  const [referralCount, setReferralCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('active')

  useEffect(() => {
    loadTasks()
  }, [])

  async function loadTasks() {
    try {
      const [tasksRes, referralRes] = await Promise.all([
        fetch('/api/task'),
        fetch('/api/referral/info')
      ])

      const tasksData = await tasksRes.json()
      const referralData = await referralRes.json()

      setDailyTasks(tasksData.dailyTasks || [])
      setWeeklyTasks(tasksData.weeklyTasks || [])
      setPermanentTasks(tasksData.permanentTasks || [])
      setTaskHistory(tasksData.taskHistory || [])
      setReferralCount(referralData.totalReferrals || 0)
    } catch (error) {
      console.error('Error loading tasks:', error)
      toast.error('Görevler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  async function claimReward(taskId: string) {
    if (!user) {
      toast.error('Ödül almak için giriş yapmalısınız')
      setShowLoginModal(true)
      return
    }

    setClaiming(taskId)
    try {
      const response = await fetch('/api/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast.success(`Ödül alındı! +${data.rewards.points} puan, +${data.rewards.xp} XP`)
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
      <Card className={`relative overflow-hidden transition-all duration-300 hover:scale-[1.01] group ${
        task.rewardClaimed
          ? 'bg-gradient-to-br from-gray-800/40 via-gray-700/30 to-gray-800/40 border-gray-600/30'
          : canClaim
            ? 'bg-gradient-to-br from-green-900/40 via-emerald-800/30 to-green-900/40 border-2 border-green-500/50 hover:border-green-400 hover:shadow-xl hover:shadow-green-500/20'
            : 'bg-gradient-to-br from-purple-900/30 via-blue-900/20 to-purple-800/30 border border-blue-500/30 hover:border-blue-400/50 hover:shadow-lg hover:shadow-blue-500/10'
      } p-5`}>
        {/* Sparkle effects for completed tasks */}
        {canClaim && (
          <>
            <div className="absolute top-2 right-2">
              <Sparkles className="w-4 h-4 text-green-400 animate-pulse" />
            </div>
            <div className="absolute bottom-2 left-2">
              <Sparkles className="w-3 h-3 text-emerald-300 animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
          </>
        )}

        <div className="relative flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className={`p-3 rounded-xl flex-shrink-0 ${
              task.rewardClaimed
                ? 'bg-gray-700/40 shadow-inner'
                : canClaim
                  ? 'bg-gradient-to-br from-green-500/20 to-emerald-600/20 shadow-lg shadow-green-500/20'
                  : 'bg-gradient-to-br from-blue-500/20 to-purple-600/20 shadow-md'
            }`}>
              {task.rewardClaimed ? (
                <CheckCircle2 className="w-7 h-7 text-gray-400" />
              ) : canClaim ? (
                <CheckCircle2 className="w-7 h-7 text-green-400 animate-pulse" />
              ) : (
                <Icon className="w-7 h-7 text-blue-400" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className={`font-bold text-lg mb-1 ${
                task.rewardClaimed ? 'text-gray-300' : canClaim ? 'text-green-100' : 'text-white'
              }`}>{task.title}</h3>

              {task.description && (
                <p className={`text-sm mb-3 leading-relaxed ${
                  task.rewardClaimed ? 'text-gray-500' : canClaim ? 'text-green-200/80' : 'text-gray-300'
                }`}>{task.description}</p>
              )}

              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline" className={`text-xs ${
                  task.rewardClaimed
                    ? 'bg-gray-600/20 text-gray-400 border-gray-500/30'
                    : canClaim
                      ? 'bg-green-500/20 text-green-300 border-green-400/30'
                      : 'bg-blue-500/20 text-blue-300 border-blue-400/30'
                }`}>
                  {TASK_TYPE_LABELS[task.taskType] || task.taskType}
                </Badge>
                <span className={`text-sm font-medium ${
                  task.rewardClaimed ? 'text-gray-500' : canClaim ? 'text-green-200' : 'text-blue-200'
                }`}>{task.progress}</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-white/10 rounded-full h-2.5 mb-3 overflow-hidden shadow-inner">
                <div
                  className={`h-2.5 rounded-full transition-all duration-500 ${
                    task.rewardClaimed
                      ? 'bg-gradient-to-r from-gray-500 to-gray-400'
                      : canClaim
                        ? 'bg-gradient-to-r from-green-500 to-emerald-400 shadow-lg shadow-green-500/50'
                        : 'bg-gradient-to-r from-blue-500 to-purple-500'
                  }`}
                  style={{
                    width: `${Math.min((task.currentProgress / task.targetValue) * 100, 100)}%`
                  }}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {task.xpReward > 0 && (
                  <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-300 border-yellow-500/30 shadow-sm">
                    <Star className="w-3 h-3 mr-1" fill="currentColor" />
                    {task.xpReward} XP
                  </Badge>
                )}
                {task.pointsReward > 0 && (
                  <Badge variant="outline" className="text-xs bg-green-500/10 text-green-300 border-green-500/30 shadow-sm">
                    <Sparkles className="w-3 h-3 mr-1" />
                    {task.pointsReward} Puan
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
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold shadow-lg hover:shadow-green-500/50 transition-all hover:scale-105 flex-shrink-0"
            >
              {claiming === task.id ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Alınıyor
                </>
              ) : (
                <>
                  <Gift className="w-4 h-4 mr-1" />
                  Al
                </>
              )}
            </Button>
          )}
        </div>
      </Card>
    )
  }

  function HistoryCard({ item }: { item: TaskHistoryItem }) {
    const Icon = TASK_TYPE_ICONS[item.taskType] || FileText

    return (
      <Card className="bg-gradient-to-br from-slate-800/40 via-slate-700/30 to-slate-800/40 border border-slate-600/30 p-5 hover:bg-slate-800/50 transition-all duration-300">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-slate-700/40 flex-shrink-0">
            <CheckCircle2 className="w-6 h-6 text-slate-400" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white text-base mb-1">{item.title}</h3>

            {item.description && (
              <p className="text-sm text-slate-400 mb-2">{item.description}</p>
            )}

            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className="text-xs bg-slate-600/20 text-slate-300 border-slate-500/30">
                {TASK_TYPE_LABELS[item.taskType] || item.taskType}
              </Badge>
              <span className="text-xs text-slate-500">
                {new Date(item.claimedAt).toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {item.xpReward > 0 && (
                <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-300 border-yellow-500/30">
                  <Star className="w-3 h-3 mr-1" fill="currentColor" />
                  {item.xpReward} XP
                </Badge>
              )}
              {item.pointsReward > 0 && (
                <Badge variant="outline" className="text-xs bg-green-500/10 text-green-300 border-green-500/30">
                  <Sparkles className="w-3 h-3 mr-1" />
                  {item.pointsReward} Puan
                </Badge>
              )}
              <Badge variant="outline" className="text-xs bg-slate-500/10 text-slate-300 border-slate-500/30">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Tamamlandı
              </Badge>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        {/* Tabs */}
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Tabs defaultValue="active" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full bg-slate-800/50 border border-slate-700/50 mb-6 p-1">
              <TabsTrigger value="active" className="flex-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white">
                <Target className="w-4 h-4 mr-2" />
                Aktif Görevler
              </TabsTrigger>
              <TabsTrigger value="history" className="flex-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-700 data-[state=active]:to-slate-600 data-[state=active]:text-white">
                <History className="w-4 h-4 mr-2" />
                Geçmiş ({taskHistory.length})
              </TabsTrigger>
            </TabsList>

            {/* Active Tasks Tab */}
            <TabsContent value="active" className="space-y-8">
              {/* Daily Tasks */}
              {dailyTasks.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20">
                      <Calendar className="w-6 h-6 text-cyan-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                      Günlük Görevler
                    </h2>
                    {dailyTasks.filter(t => t.completed && !t.rewardClaimed).length > 0 && (
                      <Badge variant="outline" className="ml-auto bg-green-500/20 text-green-300 border-green-500/50 shadow-lg shadow-green-500/20 animate-pulse">
                        <Gift className="w-3 h-3 mr-1" />
                        {dailyTasks.filter(t => t.completed && !t.rewardClaimed).length} ödül bekliyor
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-4">
                    {dailyTasks.map(task => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </div>
                </div>
              )}

              {/* Weekly Tasks */}
              {weeklyTasks.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-teal-500/20 to-emerald-500/20">
                      <Clock className="w-6 h-6 text-teal-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">
                      Haftalık Görevler
                    </h2>
                    {weeklyTasks.filter(t => t.completed && !t.rewardClaimed).length > 0 && (
                      <Badge variant="outline" className="ml-auto bg-green-500/20 text-green-300 border-green-500/50 shadow-lg shadow-green-500/20 animate-pulse">
                        <Gift className="w-3 h-3 mr-1" />
                        {weeklyTasks.filter(t => t.completed && !t.rewardClaimed).length} ödül bekliyor
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-4">
                    {weeklyTasks.map(task => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </div>
                </div>
              )}

              {/* Permanent Tasks */}
              {permanentTasks.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                      <Target className="w-6 h-6 text-purple-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                      Kalıcı Görevler
                    </h2>
                    {permanentTasks.filter(t => t.completed && !t.rewardClaimed).length > 0 && (
                      <Badge variant="outline" className="ml-auto bg-green-500/20 text-green-300 border-green-500/50 shadow-lg shadow-green-500/20 animate-pulse">
                        <Gift className="w-3 h-3 mr-1" />
                        {permanentTasks.filter(t => t.completed && !t.rewardClaimed).length} ödül bekliyor
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-4">
                    {permanentTasks.map(task => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {dailyTasks.length === 0 && weeklyTasks.length === 0 && permanentTasks.length === 0 && (
                <Card className="bg-white/5 border-white/10 p-12 text-center">
                  <FileText className="w-20 h-20 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-2xl font-semibold text-white mb-2">Henüz Görev Yok</h3>
                  <p className="text-gray-400">Yakında yeni görevler eklenecek!</p>
                </Card>
              )}

              {/* Info Card */}
              <Card className="bg-gradient-to-br from-blue-900/40 via-indigo-900/30 to-purple-900/40 border-blue-500/30 p-6 shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-blue-500/20">
                    <Gift className="w-6 h-6 text-blue-300" />
                  </div>
                  <div className="text-blue-100">
                    <p className="font-bold text-lg mb-3 text-white">Görev Sistemi Nasıl Çalışır?</p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-blue-300 mt-0.5 flex-shrink-0" />
                        <span>Görevleri tamamlayın ve ödül kazanın</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Calendar className="w-4 h-4 text-cyan-300 mt-0.5 flex-shrink-0" />
                        <span>Günlük görevler her gün, haftalık görevler her hafta sıfırlanır</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Target className="w-4 h-4 text-purple-300 mt-0.5 flex-shrink-0" />
                        <span>Kalıcı görevler bir kez tamamlanabilir</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Gift className="w-4 h-4 text-green-300 mt-0.5 flex-shrink-0" />
                        <span>Tamamlanan görevlerin ödüllerini "Al" butonuyla talep edin</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <History className="w-4 h-4 text-gray-300 mt-0.5 flex-shrink-0" />
                        <span>Tamamlanan görevler geçmiş sekmesinde görüntülenir</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Task History Tab */}
            <TabsContent value="history" className="space-y-4">
              {taskHistory.length === 0 ? (
                <Card className="bg-white/5 border-white/10 p-12 text-center">
                  <History className="w-20 h-20 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-2xl font-semibold text-white mb-2">Henüz Görev Geçmişi Yok</h3>
                  <p className="text-gray-400">Tamamladığınız görevler burada görünecek</p>
                </Card>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white">Tamamlanan Görevler</h2>
                    <Badge variant="outline" className="bg-slate-600/20 text-slate-300 border-slate-500/30">
                      <History className="w-3 h-3 mr-1" />
                      {taskHistory.length} görev
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    {taskHistory.map(item => (
                      <HistoryCard key={item.id} item={item} />
                    ))}
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
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
