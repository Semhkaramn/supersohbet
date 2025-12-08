'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ArrowLeft, Plus, Edit, Trash2, Ticket } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface WheelPrize {
  id: string
  name: string
  points: number
  probability: number
  color: string
  isActive: boolean
  order: number
  _count?: {
    wheelSpins: number
  }
}

export default function AdminWheelPage() {
  const router = useRouter()
  const [prizes, setPrizes] = useState<WheelPrize[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPrize, setEditingPrize] = useState<WheelPrize | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    points: 0,
    probability: 1.0,
    color: '#FF6B6B',
    order: 0
  })

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin')
      return
    }
    loadPrizes()
  }, [])

  async function loadPrizes() {
    try {
      const response = await fetch('/api/admin/wheel')
      const data = await response.json()
      setPrizes(data.prizes || [])
    } catch (error) {
      console.error('Error loading prizes:', error)
      toast.error('Ödüller yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  function openDialog(prize?: WheelPrize) {
    if (prize) {
      setEditingPrize(prize)
      setFormData({
        name: prize.name,
        points: prize.points,
        probability: prize.probability,
        color: prize.color,
        order: prize.order
      })
    } else {
      setEditingPrize(null)
      setFormData({
        name: '',
        points: 0,
        probability: 1.0,
        color: '#FF6B6B',
        order: prizes.length
      })
    }
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      const url = editingPrize
        ? `/api/admin/wheel/${editingPrize.id}`
        : '/api/admin/wheel'

      const method = editingPrize ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (data.prize) {
        toast.success(editingPrize ? 'Ödül güncellendi' : 'Ödül eklendi')
        setDialogOpen(false)
        loadPrizes()
      } else {
        toast.error(data.error || 'İşlem başarısız')
      }
    } catch (error) {
      console.error('Submit error:', error)
      toast.error('Bir hata oluştu')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Bu ödülü silmek istediğinizden emin misiniz?')) return

    try {
      const response = await fetch(`/api/admin/wheel/${id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Ödül silindi')
        loadPrizes()
      } else {
        toast.error(data.error || 'Silme başarısız')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Bir hata oluştu')
    }
  }

  async function toggleActive(id: string, currentActive: boolean) {
    try {
      const response = await fetch(`/api/admin/wheel/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive })
      })

      const data = await response.json()

      if (data.prize) {
        toast.success('Durum güncellendi')
        loadPrizes()
      } else {
        toast.error(data.error || 'Güncelleme başarısız')
      }
    } catch (error) {
      console.error('Toggle error:', error)
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
              <Ticket className="w-8 h-8" />
              Çark Ödülleri
            </h1>
            <p className="text-gray-400 mt-1">Şans çarkı ödüllerini yönetin</p>
          </div>
          <Button
            onClick={() => openDialog()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Yeni Ödül Ekle
          </Button>
        </div>

        {/* Prizes List */}
        <div className="space-y-3">
          {prizes.length === 0 ? (
            <Card className="bg-white/5 border-white/10 p-12 text-center">
              <Ticket className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">Henüz ödül eklenmemiş</p>
            </Card>
          ) : (
            prizes.map((prize) => (
              <Card key={prize.id} className="bg-white/5 border-white/10 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: prize.color }}
                    >
                      {prize.points}
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-white">{prize.name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          prize.isActive
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {prize.isActive ? 'Aktif' : 'Pasif'}
                        </span>
                      </div>
                      <div className="flex gap-4 mt-1">
                        <span className="text-sm text-yellow-400">{prize.points} Puan</span>
                        <span className="text-sm text-purple-400">Olasılık: {prize.probability}</span>
                        {prize._count && (
                          <span className="text-sm text-green-400">{prize._count.wheelSpins} kazanım</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleActive(prize.id, prize.isActive)}
                      className="border-white/20 hover:bg-white/10"
                    >
                      {prize.isActive ? 'Devre Dışı' : 'Aktif Et'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openDialog(prize)}
                      className="border-white/20 hover:bg-white/10"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(prize.id)}
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
              {editingPrize ? 'Ödülü Düzenle' : 'Yeni Ödül Ekle'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-white">Ödül Adı</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-white/5 border-white/10 text-white mt-1"
                placeholder="Örn: Büyük Ödül"
                required
              />
            </div>

            <div>
              <Label htmlFor="points" className="text-white">Puan</Label>
              <Input
                id="points"
                type="number"
                value={formData.points}
                onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) })}
                className="bg-white/5 border-white/10 text-white mt-1"
                min="0"
                required
              />
            </div>

            <div>
              <Label htmlFor="probability" className="text-white">Olasılık (1.0 = Normal)</Label>
              <Input
                id="probability"
                type="number"
                step="0.1"
                value={formData.probability}
                onChange={(e) => setFormData({ ...formData, probability: parseFloat(e.target.value) })}
                className="bg-white/5 border-white/10 text-white mt-1"
                min="0.1"
                max="10"
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                Yüksek değer = Daha sık çıkar
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
                  placeholder="#FF6B6B"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="order" className="text-white">Sıralama (Çarkta gösterim sırası)</Label>
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
                {editingPrize ? 'Güncelle' : 'Ekle'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
