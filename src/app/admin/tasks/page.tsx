'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ArrowLeft, Plus, Edit, Trash2, FileText, CheckCircle, XCircle, Users, MessageSquare, Target, Award, TrendingUp, Calendar, Clock } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface Task {
  id: string
  title: string
  description?: string
  category: string
  taskType: string
  targetValue: number
  xpReward: number
  pointsReward: number
  duration?: number
  expiresAt?: string
  completionLimit?: number
  isActive: boolean
  order: number
  _count?: {
    completions: number
  }
}

const TASK_CATEGORIES = [
  { value: 'daily', label: 'Günlük', icon: Calendar, color: 'cyan' },
  { value: 'weekly', label: 'Haftalık', icon: Clock, color: 'teal' },
  { value: 'permanent', label: 'Kalıcı', icon: Target, color: 'purple' }
]

const TASK_TYPES = [
  { value: 'invite_users', label: 'Üye Davet Et', icon: Users, description: 'Kullanıcıların belirli sayıda arkadaş davet etmesi' },
  { value: 'send_messages', label: 'Mesaj Gönder', icon: MessageSquare, description: 'Belirli sayıda mesaj göndermek' },
  { value: 'spin_wheel', label: 'Çark Çevir', icon: Target, description: 'Belirli sayıda çark çevirmek' },
  { value: 'earn_points', label: 'Puan Kazan', icon: Award, description: 'Belirli miktarda puan kazanmak' },
  { value: 'reach_level', label: 'Seviye Ulaş', icon: TrendingUp, description: 'Belirli bir seviyeye ulaşmak' }
]

export default function AdminTasksPage() {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'daily',
    taskType: 'send_messages',
    targetValue: 1,
    xpReward: 0,
    pointsReward: 0,
    duration: null as number | null,
    expiresAt: '',
    completionLimit: null as number | null,
    isActive: true,
    order: 0
  })

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin')
      return
    }
    loadTasks()
  }, [])

  async function loadTasks() {
    try {
      const response = await fetch('/api/admin/tasks')
      const data = await response.json()
      setTasks(data || [])
    } catch (error) {
      console.error('Error loading tasks:', error)
      toast.error('Görevler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  function openDialog(task?: Task) {
    if (task) {
      setEditingTask(task)
      setFormData({
        title: task.title,
        description: task.description || '',
        category: task.category,
        taskType: task.taskType,
        targetValue: task.targetValue,
        xpReward: task.xpReward,
        pointsReward: task.pointsReward,
        duration: task.duration || null,
        expiresAt: task.expiresAt ? new Date(task.expiresAt).toISOString().slice(0, 16) : '',
        completionLimit: task.completionLimit || null,
        isActive: task.isActive,
        order: task.order
      })
    } else {
      setEditingTask(null)
      setFormData({
        title: '',
        description: '',
        category: 'daily',
        taskType: 'send_messages',
        targetValue: 1,
        xpReward: 0,
        pointsReward: 0,
        duration: null,
        expiresAt: '',
        completionLimit: null,
        isActive: true,
        order: tasks.length
      })
    }
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      const url = editingTask
        ? `/api/admin/tasks/${editingTask.id}`
        : '/api/admin/tasks'

      const method = editingTask ? 'PUT' : 'POST'

      const submitData = {
        ...formData,
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      })

      const data = await response.json()

      if (data.id || data.success) {
        toast.success(editingTask ? 'Görev güncellendi' : 'Görev eklendi')
        setDialogOpen(false)
        loadTasks()
      } else {
        toast.error('Bir hata oluştu')
      }
    } catch (error) {
      console.error('Submit error:', error)
      toast.error('Bir hata oluştu')
    }
  }

  async function handleDelete(id: string) {
    setDeleteId(id)
    setConfirmOpen(true)
  }

  async function confirmDelete() {
    if (!deleteId) return

    try {
      const response = await fetch(`/api/admin/tasks/${deleteId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Görev silindi')
        loadTasks()
      } else {
        toast.error('Görev silinemedi')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Bir hata oluştu')
    } finally {
      setConfirmOpen(false)
      setDeleteId(null)
    }
  }

  function getTaskTypeLabel(type: string) {
    return TASK_TYPES.find(t => t.value === type)?.label || type
  }

  function getTaskTypeIcon(type: string) {
    const taskType = TASK_TYPES.find(t => t.value === type)
    const Icon = taskType?.icon || FileText
    return <Icon className="w-5 h-5" />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  const dailyTasks = tasks.filter(t => t.category === 'daily')
  const weeklyTasks = tasks.filter(t => t.category === 'weekly')
  const permanentTasks = tasks.filter(t => t.category === 'permanent')

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard">
              <Button variant="outline" size="icon" className="border-white/20 hover:bg-white/10">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white">Görev Yönetimi</h1>
              <p className="text-gray-400">Detaylı görev sistemi ile kullanıcı aktivitelerini yönetin</p>
            </div>
          </div>
          <Button
            onClick={() => openDialog()}
            className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800"
          >
            <Plus className="w-4 h-4 mr-2" />
            Yeni Görev
          </Button>
        </div>

        {/* Günlük Görevler */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cyan-400" />
            Günlük Görevler ({dailyTasks.length})
          </h2>
          <div className="grid gap-4">
            {dailyTasks.map(task => (
              <TaskCard key={task.id} task={task} onEdit={openDialog} onDelete={handleDelete} getTaskTypeLabel={getTaskTypeLabel} getTaskTypeIcon={getTaskTypeIcon} />
            ))}
            {dailyTasks.length === 0 && (
              <Card className="bg-white/5 border-white/10 p-8 text-center">
                <p className="text-gray-400">Henüz günlük görev eklenmemiş</p>
              </Card>
            )}
          </div>
        </div>

        {/* Haftalık Görevler */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-teal-400" />
            Haftalık Görevler ({weeklyTasks.length})
          </h2>
          <div className="grid gap-4">
            {weeklyTasks.map(task => (
              <TaskCard key={task.id} task={task} onEdit={openDialog} onDelete={handleDelete} getTaskTypeLabel={getTaskTypeLabel} getTaskTypeIcon={getTaskTypeIcon} />
            ))}
            {weeklyTasks.length === 0 && (
              <Card className="bg-white/5 border-white/10 p-8 text-center">
                <p className="text-gray-400">Henüz haftalık görev eklenmemiş</p>
              </Card>
            )}
          </div>
        </div>

        {/* Kalıcı Görevler */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-400" />
            Kalıcı Görevler ({permanentTasks.length})
          </h2>
          <div className="grid gap-4">
            {permanentTasks.map(task => (
              <TaskCard key={task.id} task={task} onEdit={openDialog} onDelete={handleDelete} getTaskTypeLabel={getTaskTypeLabel} getTaskTypeIcon={getTaskTypeIcon} />
            ))}
            {permanentTasks.length === 0 && (
              <Card className="bg-white/5 border-white/10 p-8 text-center">
                <p className="text-gray-400">Henüz kalıcı görev eklenmemiş</p>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {editingTask ? 'Görevi Düzenle' : 'Yeni Görev Ekle'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Temel Bilgiler */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-2">Temel Bilgiler</h3>

              <div>
                <Label>Görev Başlığı *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Örn: 5 Mesaj Gönder"
                  required
                  className="bg-slate-800 border-slate-700"
                />
              </div>

              <div>
                <Label>Açıklama</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Görev hakkında detaylı açıklama (opsiyonel)"
                  className="bg-slate-800 border-slate-700 min-h-[80px]"
                />
              </div>
            </div>

            {/* Görev Tipi ve Kategori */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-2">Görev Tipi</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Kategori *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-400 mt-1">
                    {formData.category === 'daily' && 'Her gün sıfırlanır'}
                    {formData.category === 'weekly' && 'Her hafta sıfırlanır'}
                    {formData.category === 'permanent' && 'Bir kez tamamlanır'}
                  </p>
                </div>

                <div>
                  <Label>Görev Türü *</Label>
                  <Select
                    value={formData.taskType}
                    onValueChange={(value) => setFormData({ ...formData, taskType: value })}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-400 mt-1">
                    {TASK_TYPES.find(t => t.value === formData.taskType)?.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Hedef ve Ödüller */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-2">Hedef ve Ödüller</h3>

              <div>
                <Label>Hedef Değer *</Label>
                <Input
                  type="number"
                  value={formData.targetValue}
                  onChange={(e) => {
                    const val = e.target.value === '' ? 1 : Number(e.target.value)
                    setFormData({ ...formData, targetValue: val })
                  }}
                  className="bg-slate-800 border-slate-700"
                  min="1"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  {formData.taskType === 'invite_users' && `${formData.targetValue} arkadaş davet etmek gerekir`}
                  {formData.taskType === 'send_messages' && `${formData.targetValue} mesaj göndermek gerekir`}
                  {formData.taskType === 'spin_wheel' && `${formData.targetValue} kez çark çevirmek gerekir`}
                  {formData.taskType === 'earn_points' && `${formData.targetValue} puan kazanmak gerekir`}
                  {formData.taskType === 'reach_level' && `Seviye ${formData.targetValue}'e ulaşmak gerekir`}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>XP Ödülü</Label>
                  <Input
                    type="number"
                    value={formData.xpReward}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : Number(e.target.value)
                      setFormData({ ...formData, xpReward: val })
                    }}
                    className="bg-slate-800 border-slate-700"
                    min="0"
                  />
                </div>
                <div>
                  <Label>Puan Ödülü</Label>
                  <Input
                    type="number"
                    value={formData.pointsReward}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : Number(e.target.value)
                      setFormData({ ...formData, pointsReward: val })
                    }}
                    className="bg-slate-800 border-slate-700"
                    min="0"
                  />
                </div>
              </div>
            </div>

            {/* Süre Ayarları */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-2">Süre Ayarları (Opsiyonel)</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Süre (Saat)</Label>
                  <Input
                    type="number"
                    value={formData.duration || ''}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="Süresiz"
                    className="bg-slate-800 border-slate-700"
                    min="1"
                  />
                  <p className="text-xs text-gray-400 mt-1">Görev başladıktan sonra kaç saat geçerli olacak</p>
                </div>

                <div>
                  <Label>Son Geçerlilik Tarihi</Label>
                  <Input
                    type="datetime-local"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                    className="bg-slate-800 border-slate-700"
                  />
                  <p className="text-xs text-gray-400 mt-1">Bu tarihten sonra görev görünmez</p>
                </div>
              </div>
            </div>

            {/* Tamamlanma Limiti */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-2">Tamamlanma Limiti</h3>

              <div>
                <Label>Her Üye Kaç Kez Tamamlayabilir?</Label>
                <Input
                  type="number"
                  value={formData.completionLimit || ''}
                  onChange={(e) => setFormData({ ...formData, completionLimit: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="Sınırsız"
                  className="bg-slate-800 border-slate-700"
                  min="1"
                />
                <p className="text-xs text-gray-400 mt-1">Boş bırakılırsa her üye sınırsız sayıda tamamlayabilir</p>
              </div>
            </div>

            {/* Diğer Ayarlar */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-2">Diğer Ayarlar</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Gösterim Sırası</Label>
                  <Input
                    type="number"
                    value={formData.order}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : Number(e.target.value)
                      setFormData({ ...formData, order: val })
                    }}
                    className="bg-slate-800 border-slate-700"
                    min="0"
                  />
                </div>

                <div className="flex items-center gap-3 pt-6">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-5 h-5 rounded border-slate-700 bg-slate-800"
                  />
                  <Label htmlFor="isActive" className="cursor-pointer">Görevi Aktif Et</Label>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 justify-end pt-4 border-t border-white/10">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="border-white/20 hover:bg-white/10"
              >
                İptal
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800"
              >
                {editingTask ? 'Güncelle' : 'Ekle'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Görev Silme"
        description={`Bu görevi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`}
        onConfirm={confirmDelete}
      />
    </div>
  )
}

// Task Card Component
function TaskCard({ task, onEdit, onDelete, getTaskTypeLabel, getTaskTypeIcon }: {
  task: Task
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  getTaskTypeLabel: (type: string) => string
  getTaskTypeIcon: (type: string) => React.ReactNode
}) {
  return (
    <Card className="bg-white/5 border-white/10 p-4 hover:bg-white/[0.07] transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/5 rounded-lg">
              {getTaskTypeIcon(task.taskType)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-white">{task.title}</h3>
                {task.isActive ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400" />
                )}
              </div>
              <p className="text-sm text-gray-400">{getTaskTypeLabel(task.taskType)}</p>
            </div>
          </div>

          {task.description && (
            <p className="text-gray-400 text-sm mb-3 ml-14">{task.description}</p>
          )}

          <div className="flex flex-wrap gap-3 text-sm ml-14">
            <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded">
              🎯 Hedef: {task.targetValue}
            </span>
            {task.xpReward > 0 && (
              <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded">
                ⭐ {task.xpReward} XP
              </span>
            )}
            {task.pointsReward > 0 && (
              <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded">
                💰 {task.pointsReward} Puan
              </span>
            )}
            {task.duration && (
              <span className="px-2 py-1 bg-orange-500/20 text-orange-300 rounded">
                ⏱️ {task.duration} saat
              </span>
            )}
            {task.completionLimit && (
              <span className="px-2 py-1 bg-pink-500/20 text-pink-300 rounded">
                🔄 {task.completionLimit}x limit
              </span>
            )}
            {task._count && (
              <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded">
                ✅ {task._count.completions} tamamlanma
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2 ml-4">
          <Button
            onClick={() => onEdit(task)}
            size="icon"
            variant="outline"
            className="border-white/20 hover:bg-white/10"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => onDelete(task.id)}
            size="icon"
            variant="outline"
            className="border-red-500/50 hover:bg-red-500/20 text-red-400"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  )
}
