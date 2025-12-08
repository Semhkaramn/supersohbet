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
import { ArrowLeft, Plus, Edit, Trash2, FileText, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface Task {
  id: string
  title: string
  description?: string
  type: string
  xpReward: number
  pointsReward: number
  requirement: number
  isActive: boolean
  order: number
  _count?: {
    completions: number
  }
}

export default function AdminTasksPage() {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'daily',
    xpReward: 0,
    pointsReward: 0,
    requirement: 1,
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
        type: task.type,
        xpReward: task.xpReward,
        pointsReward: task.pointsReward,
        requirement: task.requirement,
        isActive: task.isActive,
        order: task.order
      })
    } else {
      setEditingTask(null)
      setFormData({
        title: '',
        description: '',
        type: 'daily',
        xpReward: 0,
        pointsReward: 0,
        requirement: 1,
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

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
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
    if (!confirm('Bu görevi silmek istediğinizden emin misiniz?')) return

    try {
      const response = await fetch(`/api/admin/tasks/${id}`, {
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
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  const dailyTasks = tasks.filter(t => t.type === 'daily')
  const weeklyTasks = tasks.filter(t => t.type === 'weekly')

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
              <p className="text-gray-400">Günlük ve haftalık görevleri yönetin</p>
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
            <FileText className="w-5 h-5 text-cyan-400" />
            Günlük Görevler ({dailyTasks.length})
          </h2>
          <div className="grid gap-4">
            {dailyTasks.map(task => (
              <Card key={task.id} className="bg-white/5 border-white/10 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">{task.title}</h3>
                      {task.isActive ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400" />
                      )}
                    </div>
                    {task.description && (
                      <p className="text-gray-400 text-sm mb-3">{task.description}</p>
                    )}
                    <div className="flex flex-wrap gap-3 text-sm">
                      <span className="text-yellow-400">⭐ {task.xpReward} XP</span>
                      <span className="text-green-400">💰 {task.pointsReward} Puan</span>
                      <span className="text-blue-400">📝 Gereksinim: {task.requirement}</span>
                      {task._count && (
                        <span className="text-purple-400">✅ {task._count.completions} tamamlanma</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      onClick={() => openDialog(task)}
                      size="icon"
                      variant="outline"
                      className="border-white/20 hover:bg-white/10"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(task.id)}
                      size="icon"
                      variant="outline"
                      className="border-red-500/50 hover:bg-red-500/20 text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
            {dailyTasks.length === 0 && (
              <Card className="bg-white/5 border-white/10 p-8 text-center">
                <p className="text-gray-400">Henüz günlük görev eklenmemiş</p>
              </Card>
            )}
          </div>
        </div>

        {/* Haftalık Görevler */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-400" />
            Haftalık Görevler ({weeklyTasks.length})
          </h2>
          <div className="grid gap-4">
            {weeklyTasks.map(task => (
              <Card key={task.id} className="bg-white/5 border-white/10 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">{task.title}</h3>
                      {task.isActive ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400" />
                      )}
                    </div>
                    {task.description && (
                      <p className="text-gray-400 text-sm mb-3">{task.description}</p>
                    )}
                    <div className="flex flex-wrap gap-3 text-sm">
                      <span className="text-yellow-400">⭐ {task.xpReward} XP</span>
                      <span className="text-green-400">💰 {task.pointsReward} Puan</span>
                      <span className="text-blue-400">📝 Gereksinim: {task.requirement}</span>
                      {task._count && (
                        <span className="text-purple-400">✅ {task._count.completions} tamamlanma</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      onClick={() => openDialog(task)}
                      size="icon"
                      variant="outline"
                      className="border-white/20 hover:bg-white/10"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(task.id)}
                      size="icon"
                      variant="outline"
                      className="border-red-500/50 hover:bg-red-500/20 text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
            {weeklyTasks.length === 0 && (
              <Card className="bg-white/5 border-white/10 p-8 text-center">
                <p className="text-gray-400">Henüz haftalık görev eklenmemiş</p>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>
              {editingTask ? 'Görevi Düzenle' : 'Yeni Görev Ekle'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Başlık</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Görev başlığı"
                required
                className="bg-slate-800 border-slate-700"
              />
            </div>
            <div>
              <Label>Açıklama</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Görev açıklaması (opsiyonel)"
                className="bg-slate-800 border-slate-700"
              />
            </div>
            <div>
              <Label>Görev Tipi</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Günlük</SelectItem>
                  <SelectItem value="weekly">Haftalık</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>XP Ödülü</Label>
                <Input
                  type="number"
                  value={formData.xpReward}
                  onChange={(e) => setFormData({ ...formData, xpReward: parseInt(e.target.value) })}
                  className="bg-slate-800 border-slate-700"
                />
              </div>
              <div>
                <Label>Puan Ödülü</Label>
                <Input
                  type="number"
                  value={formData.pointsReward}
                  onChange={(e) => setFormData({ ...formData, pointsReward: parseInt(e.target.value) })}
                  className="bg-slate-800 border-slate-700"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Gereksinim</Label>
                <Input
                  type="number"
                  value={formData.requirement}
                  onChange={(e) => setFormData({ ...formData, requirement: parseInt(e.target.value) })}
                  className="bg-slate-800 border-slate-700"
                  min="1"
                />
              </div>
              <div>
                <Label>Sıra</Label>
                <Input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                  className="bg-slate-800 border-slate-700"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4"
              />
              <Label>Aktif</Label>
            </div>
            <div className="flex gap-2 justify-end">
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
    </div>
  )
}
