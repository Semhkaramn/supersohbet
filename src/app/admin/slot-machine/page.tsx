'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ArrowLeft, Plus, Edit, Trash2, Dices } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface SlotPrize {
  id: string
  name: string
  symbol: string
  points: number
  chance: number
  color: string
  isActive: boolean
  order: number
  _count?: {
    slotSpins: number
  }
}

export default function AdminSlotMachinePage() {
  const router = useRouter()
  const [prizes, setPrizes] = useState<SlotPrize[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPrize, setEditingPrize] = useState<SlotPrize | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    points: 0,
    chance: 25,
    color: '#FFD700',
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
      const response = await fetch('/api/admin/slot-machine')
      const data = await response.json()
      setPrizes(data.prizes || [])
    } catch (error) {
      console.error('Error loading prizes:', error)
      toast.error('Ödüller yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  function openDialog(prize?: SlotPrize) {
    if (prize) {
      setEditingPrize(prize)
      setFormData({
        name: prize.name,
        symbol: prize.symbol,
        points: prize.points,
        chance: prize.chance,
        color: prize.color,
        order: prize.order
      })
    } else {
      setEditingPrize(null)
      setFormData({
        name: '',
        symbol: '',
        points: 0,
        chance: 25,
        color: '#FFD700',
        order: prizes.length
      })
    }
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      const url = editingPrize
        ? `/api/admin/slot-machine/${editingPrize.id}`
        : '/api/admin/slot-machine'

      const method = editingPrize ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (data.success) {
        toast.success(editingPrize ? 'Ödül güncellendi' : 'Ödül eklendi')
        setDialogOpen(false)
        loadPrizes()
      } else {
        toast.error(data.error || 'İşlem başarısız')
      }
    } catch (error) {
      console.error('Error saving prize:', error)
      toast.error('Bir hata oluştu')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Bu ödülü silmek istediğinizden emin misiniz?')) return

    try {
      const response = await fetch(`/api/admin/slot-machine/${id}`, {
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
      console.error('Error deleting prize:', error)
      toast.error('Bir hata oluştu')
    }
  }

  async function toggleActive(prize: SlotPrize) {
    try {
      const response = await fetch(`/api/admin/slot-machine/${prize.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...prize, isActive: !prize.isActive })
      })

      const data = await response.json()

      if (data.success) {
        toast.success(prize.isActive ? 'Ödül devre dışı' : 'Ödül aktif')
        loadPrizes()
      }
    } catch (error) {
      console.error('Error toggling active:', error)
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
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard">
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Dices className="w-6 h-6" />
                Slot Makinesi Yönetimi
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Slot makinesi ödüllerini ve şans oranlarını yönetin
              </p>
            </div>
          </div>
          <Button onClick={() => openDialog()} className="gap-2">
            <Plus className="w-4 h-4" />
            Yeni Ödül Ekle
          </Button>
        </div>

        {/* Info Card */}
        <Card className="bg-blue-500/10 border-blue-500/20 p-4 mb-6">
          <p className="text-blue-300 text-sm">
            <strong>Not:</strong> Şans oranı 0 olarak ayarlanan ödüller hiç gelmez.
            Tüm aktif ödüllerin şans oranları toplamı 100 olmalıdır (örn: 4 ödül için her biri 25).
          </p>
        </Card>

        {/* Prizes Table */}
        <Card className="bg-slate-800 border-slate-700">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left p-4 text-slate-300">Sıra</th>
                  <th className="text-left p-4 text-slate-300">Sembol</th>
                  <th className="text-left p-4 text-slate-300">İsim</th>
                  <th className="text-left p-4 text-slate-300">Puan</th>
                  <th className="text-left p-4 text-slate-300">Şans (%)</th>
                  <th className="text-left p-4 text-slate-300">Renk</th>
                  <th className="text-left p-4 text-slate-300">Durum</th>
                  <th className="text-left p-4 text-slate-300">Kullanım</th>
                  <th className="text-right p-4 text-slate-300">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {prizes.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center p-8 text-slate-400">
                      Henüz ödül eklenmemiş
                    </td>
                  </tr>
                ) : (
                  prizes.map((prize) => (
                    <tr key={prize.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="p-4 text-white">{prize.order}</td>
                      <td className="p-4">
                        <div
                          className="text-3xl font-black"
                          style={{ color: prize.color }}
                        >
                          {prize.symbol}
                        </div>
                      </td>
                      <td className="p-4 text-white font-semibold">{prize.name}</td>
                      <td className="p-4 text-yellow-400 font-bold">{prize.points}</td>
                      <td className="p-4">
                        <span className={`font-bold ${prize.chance === 0 ? 'text-red-400' : 'text-green-400'}`}>
                          {prize.chance}%
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded border border-white/20"
                            style={{ backgroundColor: prize.color }}
                          ></div>
                          <span className="text-slate-400 text-sm">{prize.color}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <Button
                          variant={prize.isActive ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => toggleActive(prize)}
                          className={prize.isActive ? 'bg-green-600 hover:bg-green-700' : ''}
                        >
                          {prize.isActive ? 'Aktif' : 'Pasif'}
                        </Button>
                      </td>
                      <td className="p-4 text-slate-400">
                        {prize._count?.slotSpins || 0} çevirme
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => openDialog(prize)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDelete(prize.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Total Chance Info */}
        {prizes.length > 0 && (
          <Card className="bg-slate-800 border-slate-700 p-4 mt-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Toplam Şans Oranı (Aktif Ödüller)</span>
              <span className={`text-xl font-bold ${
                prizes.filter(p => p.isActive).reduce((sum, p) => sum + p.chance, 0) === 100
                  ? 'text-green-400'
                  : 'text-yellow-400'
              }`}>
                {prizes.filter(p => p.isActive).reduce((sum, p) => sum + p.chance, 0)}%
              </span>
            </div>
          </Card>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingPrize ? 'Ödül Düzenle' : 'Yeni Ödül Ekle'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-white">Ödül İsmi</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Örn: Jackpot"
                required
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>

            <div>
              <Label htmlFor="symbol" className="text-white">Sembol</Label>
              <Input
                id="symbol"
                value={formData.symbol}
                onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                placeholder="Örn: 777, BAR, 🍒"
                required
                className="bg-slate-900 border-slate-700 text-white"
              />
              <p className="text-xs text-slate-400 mt-1">
                Emoji kullanabilir veya yazı yazabilirsiniz
              </p>
            </div>

            <div>
              <Label htmlFor="points" className="text-white">Kazanç (Puan)</Label>
              <Input
                id="points"
                type="number"
                min="0"
                value={formData.points}
                onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) })}
                required
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>

            <div>
              <Label htmlFor="chance" className="text-white">
                Şans Oranı (0-100)
              </Label>
              <Input
                id="chance"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.chance}
                onChange={(e) => setFormData({ ...formData, chance: parseFloat(e.target.value) })}
                required
                className="bg-slate-900 border-slate-700 text-white"
              />
              <p className="text-xs text-slate-400 mt-1">
                0 girerseniz bu ödül hiç gelmez
              </p>
            </div>

            <div>
              <Label htmlFor="color" className="text-white">Renk</Label>
              <div className="flex gap-2">
                <Input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-20 h-10 bg-slate-900 border-slate-700"
                />
                <Input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="flex-1 bg-slate-900 border-slate-700 text-white"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="order" className="text-white">Sıra</Label>
              <Input
                id="order"
                type="number"
                min="0"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                required
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                {editingPrize ? 'Güncelle' : 'Ekle'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="flex-1"
              >
                İptal
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
