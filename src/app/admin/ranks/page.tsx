'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ArrowLeft, Plus, Edit, Trash2, BarChart3 } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface Rank {
  id: string
  name: string
  minXp: number
  icon: string
  color: string
  order: number
  _count?: {
    users: number
  }
}

export default function AdminRanksPage() {
  const router = useRouter()
  const [ranks, setRanks] = useState<Rank[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRank, setEditingRank] = useState<Rank | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    minXp: 0,
    icon: '⭐',
    color: '#FFD700',
    order: 0
  })

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin')
      return
    }
    loadRanks()
  }, [])

  async function loadRanks() {
    try {
      const response = await fetch('/api/admin/ranks')
      const data = await response.json()
      setRanks(data.ranks || [])
    } catch (error) {
      console.error('Error loading ranks:', error)
      toast.error('Rütbeler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  function openDialog(rank?: Rank) {
    if (rank) {
      setEditingRank(rank)
      setFormData({
        name: rank.name,
        minXp: rank.minXp,
        icon: rank.icon,
        color: rank.color,
        order: rank.order
      })
    } else {
      setEditingRank(null)
      setFormData({
        name: '',
        minXp: 0,
        icon: '⭐',
        color: '#FFD700',
        order: ranks.length
      })
    }
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      const url = editingRank
        ? `/api/admin/ranks/${editingRank.id}`
        : '/api/admin/ranks'

      const method = editingRank ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (data.rank) {
        toast.success(editingRank ? 'Rütbe güncellendi' : 'Rütbe eklendi')
        setDialogOpen(false)
        loadRanks()
      } else {
        toast.error(data.error || 'İşlem başarısız')
      }
    } catch (error) {
      console.error('Submit error:', error)
      toast.error('Bir hata oluştu')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Bu rütbeyi silmek istediğinizden emin misiniz?')) return

    try {
      const response = await fetch(`/api/admin/ranks/${id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Rütbe silindi')
        loadRanks()
      } else {
        toast.error(data.error || 'Silme başarısız')
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

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/admin/dashboard">
              <Button variant="outline" className="mb-4 border-white/20 hover:bg-white/10">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Geri
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-8 h-8" />
              Rütbe Sistemi
            </h1>
            <p className="text-gray-400 mt-1">Rütbeleri yönetin</p>
          </div>
          <Button
            onClick={() => openDialog()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Yeni Rütbe Ekle
          </Button>
        </div>

        {/* Ranks List */}
        <div className="space-y-3">
          {ranks.length === 0 ? (
            <Card className="bg-white/5 border-white/10 p-12 text-center">
              <BarChart3 className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">Henüz rütbe eklenmemiş</p>
            </Card>
          ) : (
            ranks.map((rank) => (
              <Card key={rank.id} className="bg-white/5 border-white/10 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                      style={{ backgroundColor: `${rank.color}20`, color: rank.color }}
                    >
                      {rank.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white" style={{ color: rank.color }}>
                        {rank.name}
                      </h3>
                      <div className="flex gap-4 mt-1">
                        <span className="text-sm text-purple-400">{rank.minXp} XP gerekli</span>
                        {rank._count && (
                          <span className="text-sm text-green-400">{rank._count.users} kullanıcı</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openDialog(rank)}
                      className="border-white/20 hover:bg-white/10"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(rank.id)}
                      className="border-red-500/20 hover:bg-red-500/10 text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-900 border-white/20">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingRank ? 'Rütbeyi Düzenle' : 'Yeni Rütbe Ekle'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-white">Rütbe Adı</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-white/5 border-white/10 text-white mt-1"
                placeholder="Örn: Altın Üye"
                required
              />
            </div>

            <div>
              <Label htmlFor="minXp" className="text-white">Minimum XP</Label>
              <Input
                id="minXp"
                type="number"
                value={formData.minXp}
                onChange={(e) => setFormData({ ...formData, minXp: parseInt(e.target.value) })}
                className="bg-white/5 border-white/10 text-white mt-1"
                min="0"
                required
              />
            </div>

            <div>
              <Label htmlFor="icon" className="text-white">İkon (Emoji)</Label>
              <Input
                id="icon"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                className="bg-white/5 border-white/10 text-white mt-1"
                placeholder="⭐"
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                Emoji seçmek için Windows: Win + . veya Mac: Cmd + Ctrl + Space
              </p>
            </div>

            <div>
              <Label htmlFor="color" className="text-white">Renk</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="bg-white/5 border-white/10 text-white w-20 h-10"
                  required
                />
                <Input
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="bg-white/5 border-white/10 text-white flex-1"
                  placeholder="#FFD700"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="order" className="text-white">Sıralama</Label>
              <Input
                id="order"
                type="number"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                className="bg-white/5 border-white/10 text-white mt-1"
                min="0"
                required
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="flex-1 border-white/20 hover:bg-white/10"
              >
                İptal
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {editingRank ? 'Güncelle' : 'Ekle'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
