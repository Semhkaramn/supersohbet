'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Plus, Edit, Trash2, Ticket, Dices, Settings as SettingsIcon } from 'lucide-react'
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

interface Setting {
  id: string
  key: string
  value: string
  description: string
  category: string
}

// Sabit slot sembolleri - sadece 4 tane
const SLOT_SYMBOLS = [
  { value: '7️⃣', label: 'Yedi', emoji: '7️⃣' },
  { value: '🍒', label: 'Kiraz', emoji: '🍒' },
  { value: '🍇', label: 'Üzüm', emoji: '🍇' },
  { value: '🍋', label: 'Limon', emoji: '🍋' }
]

export default function AdminGamesPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('wheel')

  // Wheel states
  const [wheelPrizes, setWheelPrizes] = useState<WheelPrize[]>([])
  const [wheelDialogOpen, setWheelDialogOpen] = useState(false)
  const [editingWheelPrize, setEditingWheelPrize] = useState<WheelPrize | null>(null)
  const [wheelFormData, setWheelFormData] = useState({
    name: '',
    points: 0,
    probability: 1.0,
    color: '#FF6B6B',
    order: 0
  })

  // Slot states - simplified for 4 symbols
  const [slotPrizes, setSlotPrizes] = useState<SlotPrize[]>([])
  const [slotDialogOpen, setSlotDialogOpen] = useState(false)
  const [editingSlotPrize, setEditingSlotPrize] = useState<SlotPrize | null>(null)
  const [slotFormData, setSlotFormData] = useState({
    name: '',
    symbol: '7️⃣',
    points: 0,
    chance: 25,
    color: '#FFD700',
    order: 0
  })

  // Settings states
  const [settings, setSettings] = useState<Setting[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin')
      return
    }
    loadAllData()
  }, [])

  async function loadAllData() {
    setLoading(true)
    try {
      await Promise.all([
        loadWheelPrizes(),
        loadSlotPrizes(),
        loadSettings()
      ])
    } finally {
      setLoading(false)
    }
  }

  async function loadWheelPrizes() {
    try {
      const response = await fetch('/api/admin/wheel')
      const data = await response.json()
      setWheelPrizes(data.prizes || [])
    } catch (error) {
      console.error('Error loading wheel prizes:', error)
    }
  }

  async function loadSlotPrizes() {
    try {
      const response = await fetch('/api/admin/slot-machine')
      const data = await response.json()
      setSlotPrizes(data.prizes || [])
    } catch (error) {
      console.error('Error loading slot prizes:', error)
    }
  }

  async function loadSettings() {
    try {
      const response = await fetch('/api/admin/settings')
      const data = await response.json()
      setSettings(data.settings || [])
    } catch (error) {
      console.error('Error loading settings:', error)
    }
  }

  // Wheel functions
  function openWheelDialog(prize?: WheelPrize) {
    if (prize) {
      setEditingWheelPrize(prize)
      setWheelFormData({
        name: prize.name,
        points: prize.points,
        probability: prize.probability,
        color: prize.color,
        order: prize.order
      })
    } else {
      setEditingWheelPrize(null)
      setWheelFormData({
        name: '',
        points: 0,
        probability: 1.0,
        color: '#FF6B6B',
        order: wheelPrizes.length
      })
    }
    setWheelDialogOpen(true)
  }

  async function handleWheelSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      const url = editingWheelPrize
        ? `/api/admin/wheel/${editingWheelPrize.id}`
        : '/api/admin/wheel'

      const method = editingWheelPrize ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wheelFormData)
      })

      const data = await response.json()

      if (data.prize || data.success) {
        toast.success(editingWheelPrize ? 'Çark ödülü güncellendi' : 'Çark ödülü eklendi')
        setWheelDialogOpen(false)
        loadWheelPrizes()
      } else {
        toast.error(data.error || 'İşlem başarısız')
      }
    } catch (error) {
      console.error('Submit error:', error)
      toast.error('Bir hata oluştu')
    }
  }

  async function handleWheelDelete(id: string) {
    if (!confirm('Bu ödülü silmek istediğinizden emin misiniz?')) return

    try {
      const response = await fetch(`/api/admin/wheel/${id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Ödül silindi')
        loadWheelPrizes()
      } else {
        toast.error(data.error || 'Silme başarısız')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Bir hata oluştu')
    }
  }

  async function toggleWheelActive(id: string, currentActive: boolean) {
    try {
      const response = await fetch(`/api/admin/wheel/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive })
      })

      const data = await response.json()

      if (data.prize || data.success) {
        toast.success('Durum güncellendi')
        loadWheelPrizes()
      }
    } catch (error) {
      console.error('Toggle error:', error)
      toast.error('Bir hata oluştu')
    }
  }

  // Slot functions
  function openSlotDialog(prize?: SlotPrize) {
    if (prize) {
      setEditingSlotPrize(prize)
      setSlotFormData({
        name: prize.name,
        symbol: prize.symbol,
        points: prize.points,
        chance: prize.chance,
        color: prize.color,
        order: prize.order
      })
    } else {
      setEditingSlotPrize(null)
      setSlotFormData({
        name: '',
        symbol: '7️⃣',
        points: 0,
        chance: 25,
        color: '#FFD700',
        order: slotPrizes.length
      })
    }
    setSlotDialogOpen(true)
  }

  async function handleSlotSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      const url = editingSlotPrize
        ? `/api/admin/slot-machine/${editingSlotPrize.id}`
        : '/api/admin/slot-machine'

      const method = editingSlotPrize ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: slotFormData.name,
          symbol: slotFormData.symbol,
          points: slotFormData.points,
          chance: slotFormData.chance,
          color: slotFormData.color,
          order: slotFormData.order
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success(editingSlotPrize ? 'Slot ödülü güncellendi' : 'Slot ödülü eklendi')
        setSlotDialogOpen(false)
        loadSlotPrizes()
      } else {
        toast.error(data.error || 'İşlem başarısız')
      }
    } catch (error) {
      console.error('Error saving slot prize:', error)
      toast.error('Bir hata oluştu')
    }
  }

  async function handleSlotDelete(id: string) {
    if (!confirm('Bu ödülü silmek istediğinizden emin misiniz?')) return

    try {
      const response = await fetch(`/api/admin/slot-machine/${id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Ödül silindi')
        loadSlotPrizes()
      } else {
        toast.error(data.error || 'Silme başarısız')
      }
    } catch (error) {
      console.error('Error deleting slot prize:', error)
      toast.error('Bir hata oluştu')
    }
  }

  async function toggleSlotActive(prize: SlotPrize) {
    try {
      const response = await fetch(`/api/admin/slot-machine/${prize.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !prize.isActive })
      })

      const data = await response.json()

      if (data.success) {
        toast.success(prize.isActive ? 'Ödül devre dışı' : 'Ödül aktif')
        loadSlotPrizes()
      }
    } catch (error) {
      console.error('Error toggling active:', error)
      toast.error('Bir hata oluştu')
    }
  }

  // Settings functions
  async function saveSetting(key: string, value: string) {
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Ayar kaydedildi!')
        loadSettings()
      } else {
        toast.error(data.error || 'Ayar kaydedilemedi')
      }
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Bir hata oluştu')
    }
  }

  function handleSettingChange(key: string, value: string) {
    setSettings(prev =>
      prev.map(s => s.key === key ? { ...s, value } : s)
    )
  }

  function getGameSettings() {
    return settings.filter(s =>
      s.category === 'wheel' ||
      s.category === 'slot' ||
      s.category === 'games'
    )
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
      <div className="max-w-7xl mx-auto">
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
              <Dices className="w-8 h-8" />
              Oyun Sistemleri Yönetimi
            </h1>
            <p className="text-gray-400 mt-1">Şans çarkı ve slot makinesi ayarları</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-white/10 mb-6">
            <TabsTrigger value="wheel" className="text-white flex items-center gap-2">
              <Ticket className="w-4 h-4" />
              Şans Çarkı
            </TabsTrigger>
            <TabsTrigger value="slot" className="text-white flex items-center gap-2">
              <Dices className="w-4 h-4" />
              Slot Makinesi
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-white flex items-center gap-2">
              <SettingsIcon className="w-4 h-4" />
              Oyun Ayarları
            </TabsTrigger>
          </TabsList>

          {/* WHEEL TAB */}
          <TabsContent value="wheel" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">Çark Ödülleri</h2>
              <Button onClick={() => openWheelDialog()} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Yeni Ödül Ekle
              </Button>
            </div>

            <div className="space-y-3">
              {wheelPrizes.length === 0 ? (
                <Card className="bg-white/5 border-white/10 p-12 text-center">
                  <Ticket className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">Henüz ödül eklenmemiş</p>
                </Card>
              ) : (
                wheelPrizes.map((prize) => (
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
                          onClick={() => toggleWheelActive(prize.id, prize.isActive)}
                          className="border-white/20 hover:bg-white/10"
                        >
                          {prize.isActive ? 'Devre Dışı' : 'Aktif Et'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openWheelDialog(prize)}
                          className="border-white/20 hover:bg-white/10"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleWheelDelete(prize.id)}
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
          </TabsContent>

          {/* SLOT TAB */}
          <TabsContent value="slot" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-white">Slot Makinesi Ödülleri</h2>
                <p className="text-sm text-gray-400 mt-1">
                  Toplam şans: {slotPrizes.filter(p => p.isActive).reduce((sum, p) => sum + p.chance, 0)}%
                  {slotPrizes.filter(p => p.isActive).reduce((sum, p) => sum + p.chance, 0) !== 100 && (
                    <span className="text-yellow-400 ml-2">⚠️ 100% olmalı</span>
                  )}
                </p>
              </div>
              <Button onClick={() => openSlotDialog()} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Yeni Ödül Ekle
              </Button>
            </div>

            <Card className="bg-blue-500/10 border-blue-500/20 p-4">
              <p className="text-blue-300 text-sm">
                <strong>Not:</strong> Şans oranı 0 olarak ayarlanan ödüller hiç gelmez.
                Tüm aktif ödüllerin şans oranları toplamı 100 olmalıdır.
              </p>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left p-4 text-gray-300">Sıra</th>
                      <th className="text-left p-4 text-gray-300">Sembol</th>
                      <th className="text-left p-4 text-gray-300">İsim</th>
                      <th className="text-left p-4 text-gray-300">Puan</th>
                      <th className="text-left p-4 text-gray-300">Şans (%)</th>
                      <th className="text-left p-4 text-gray-300">Renk</th>
                      <th className="text-left p-4 text-gray-300">Durum</th>
                      <th className="text-left p-4 text-gray-300">Kullanım</th>
                      <th className="text-right p-4 text-gray-300">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slotPrizes.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center p-8 text-gray-400">
                          Henüz ödül eklenmemiş
                        </td>
                      </tr>
                    ) : (
                      slotPrizes.map((prize) => (
                        <tr key={prize.id} className="border-b border-white/5 hover:bg-white/5">
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
                              <span className="text-gray-400 text-sm">{prize.color}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <Button
                              variant={prize.isActive ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => toggleSlotActive(prize)}
                              className={prize.isActive ? 'bg-green-600 hover:bg-green-700' : ''}
                            >
                              {prize.isActive ? 'Aktif' : 'Pasif'}
                            </Button>
                          </td>
                          <td className="p-4 text-gray-400">
                            {prize._count?.slotSpins || 0} çevirme
                          </td>
                          <td className="p-4">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openSlotDialog(prize)}
                                className="border-white/20 hover:bg-white/10"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSlotDelete(prize.id)}
                                className="border-red-500/20 hover:bg-red-500/10 text-red-400"
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
          </TabsContent>

          {/* SETTINGS TAB */}
          <TabsContent value="settings" className="space-y-4">
            <h2 className="text-xl font-semibold text-white mb-4">Oyun Ayarları</h2>

            <Card className="bg-white/5 border-white/10 p-6 space-y-6">
              {getGameSettings().map(setting => (
                <div key={setting.key} className="space-y-2">
                  <Label htmlFor={setting.key} className="text-white text-base">
                    {setting.description}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id={setting.key}
                      type="number"
                      value={setting.value}
                      onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                      className="bg-white/10 border-white/20 text-white flex-1"
                    />
                    <Button
                      onClick={() => saveSetting(setting.key, setting.value)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Kaydet
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">Anahtar: {setting.key}</p>
                </div>
              ))}

              {getGameSettings().length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-4">Henüz oyun ayarı eklenmemiş</p>
                  <p className="text-sm text-gray-500">
                    Veritabanına şu ayarları ekleyin:
                  </p>
                  <ul className="text-sm text-gray-500 mt-2 space-y-1">
                    <li>• daily_wheel_spins (kategori: wheel)</li>
                    <li>• daily_slot_spins (kategori: slot)</li>
                  </ul>
                </div>
              )}
            </Card>

            <Card className="bg-yellow-500/10 border-yellow-500/30 p-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">⚠️</div>
                <div className="flex-1">
                  <h3 className="text-yellow-300 font-semibold mb-1">Önemli Notlar</h3>
                  <ul className="text-yellow-200 text-sm space-y-1">
                    <li>• Günlük çark/slot hakları her 24 saatte bir sıfırlanır</li>
                    <li>• Çark olasılık değerleri toplanarak rastgele seçim yapılır</li>
                    <li>• Slot şans oranları toplamı 100 olmalıdır</li>
                    <li>• Pasif ödüller oyunda görünmez</li>
                  </ul>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Wheel Prize Dialog */}
      <Dialog open={wheelDialogOpen} onOpenChange={setWheelDialogOpen}>
        <DialogContent className="bg-slate-900 border-white/20">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingWheelPrize ? 'Çark Ödülü Düzenle' : 'Yeni Çark Ödülü Ekle'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleWheelSubmit} className="space-y-4">
            <div>
              <Label htmlFor="wheel-name" className="text-white">Ödül Adı</Label>
              <Input
                id="wheel-name"
                value={wheelFormData.name}
                onChange={(e) => setWheelFormData({ ...wheelFormData, name: e.target.value })}
                className="bg-white/5 border-white/10 text-white mt-1"
                placeholder="Örn: Büyük Ödül"
                required
              />
            </div>

            <div>
              <Label htmlFor="wheel-points" className="text-white">Puan</Label>
              <Input
                id="wheel-points"
                type="number"
                value={wheelFormData.points}
                onChange={(e) => setWheelFormData({ ...wheelFormData, points: parseInt(e.target.value) })}
                className="bg-white/5 border-white/10 text-white mt-1"
                min="0"
                required
              />
            </div>

            <div>
              <Label htmlFor="wheel-probability" className="text-white">Olasılık (1.0 = Normal)</Label>
              <Input
                id="wheel-probability"
                type="number"
                step="0.1"
                value={wheelFormData.probability}
                onChange={(e) => setWheelFormData({ ...wheelFormData, probability: parseFloat(e.target.value) })}
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
              <Label htmlFor="wheel-color" className="text-white">Renk</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="wheel-color"
                  type="color"
                  value={wheelFormData.color}
                  onChange={(e) => setWheelFormData({ ...wheelFormData, color: e.target.value })}
                  className="bg-white/5 border-white/10 text-white w-20 h-10"
                  required
                />
                <Input
                  value={wheelFormData.color}
                  onChange={(e) => setWheelFormData({ ...wheelFormData, color: e.target.value })}
                  className="bg-white/5 border-white/10 text-white flex-1"
                  placeholder="#FF6B6B"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="wheel-order" className="text-white">Sıralama</Label>
              <Input
                id="wheel-order"
                type="number"
                value={wheelFormData.order}
                onChange={(e) => setWheelFormData({ ...wheelFormData, order: parseInt(e.target.value) })}
                className="bg-white/5 border-white/10 text-white mt-1"
                min="0"
                required
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setWheelDialogOpen(false)}
                className="flex-1 border-white/20 hover:bg-white/10"
              >
                İptal
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {editingWheelPrize ? 'Güncelle' : 'Ekle'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Slot Prize Dialog */}
      <Dialog open={slotDialogOpen} onOpenChange={setSlotDialogOpen}>
        <DialogContent className="bg-slate-900 border-white/20 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingSlotPrize ? 'Slot Ödülü Düzenle' : 'Yeni Slot Ödülü Ekle'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSlotSubmit} className="space-y-4">
            <div>
              <Label htmlFor="slot-name" className="text-white">Ödül İsmi</Label>
              <Input
                id="slot-name"
                value={slotFormData.name}
                onChange={(e) => setSlotFormData({ ...slotFormData, name: e.target.value })}
                placeholder="Örn: Jackpot"
                required
                className="bg-white/5 border-white/10 text-white mt-1"
              />
            </div>

            <div>
              <Label htmlFor="slot-symbol" className="text-white">Sembol</Label>
              <Select
                value={slotFormData.symbol}
                onValueChange={(value) => setSlotFormData({ ...slotFormData, symbol: value })}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1">
                  <SelectValue placeholder="Sembol seçin" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-white/20">
                  {SLOT_SYMBOLS.map(symbol => (
                    <SelectItem
                      key={symbol.value}
                      value={symbol.value}
                      className="text-white hover:bg-white/10"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-2xl">{symbol.emoji}</span>
                        <span>{symbol.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400 mt-1">
                Listeden seçin veya özel sembol girin
              </p>
            </div>

            <div>
              <Label htmlFor="slot-points" className="text-white">Kazanç (Puan)</Label>
              <Input
                id="slot-points"
                type="number"
                min="0"
                value={slotFormData.points}
                onChange={(e) => setSlotFormData({ ...slotFormData, points: parseInt(e.target.value) })}
                required
                className="bg-white/5 border-white/10 text-white mt-1"
              />
            </div>

            <div>
              <Label htmlFor="slot-chance" className="text-white">
                Şans Oranı (0-100)
              </Label>
              <Input
                id="slot-chance"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={slotFormData.chance}
                onChange={(e) => setSlotFormData({ ...slotFormData, chance: parseFloat(e.target.value) })}
                required
                className="bg-white/5 border-white/10 text-white mt-1"
              />
              <p className="text-xs text-gray-400 mt-1">
                0 girerseniz bu ödül hiç gelmez. Tüm aktif ödüller toplamı 100 olmalı.
              </p>
            </div>

            <div>
              <Label htmlFor="slot-color" className="text-white">Renk</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="slot-color"
                  type="color"
                  value={slotFormData.color}
                  onChange={(e) => setSlotFormData({ ...slotFormData, color: e.target.value })}
                  className="w-20 h-10 bg-white/5 border-white/10"
                />
                <Input
                  type="text"
                  value={slotFormData.color}
                  onChange={(e) => setSlotFormData({ ...slotFormData, color: e.target.value })}
                  className="flex-1 bg-white/5 border-white/10 text-white"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="slot-order" className="text-white">Sıra</Label>
              <Input
                id="slot-order"
                type="number"
                min="0"
                value={slotFormData.order}
                onChange={(e) => setSlotFormData({ ...slotFormData, order: parseInt(e.target.value) })}
                required
                className="bg-white/5 border-white/10 text-white mt-1"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSlotDialogOpen(false)}
                className="flex-1 border-white/20 hover:bg-white/10"
              >
                İptal
              </Button>
              <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                {editingSlotPrize ? 'Güncelle' : 'Ekle'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
