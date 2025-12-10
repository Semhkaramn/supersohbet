'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ArrowLeft, Sparkles, Plus, Clock, Users, Gift, CheckCircle, XCircle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface RandySchedule {
  id: string
  winnerCount: number
  distributionHours: number
  prizeText: string
  sendAnnouncement: boolean
  pinMessage: boolean
  onePerUser: boolean
  minMessages: number
  messagePeriod: string
  status: string
  startTime: string
  createdAt: string
  slots?: RandySlot[]
}

interface RandySlot {
  id: string
  schedTime: string
  assigned: boolean
  assignedUser?: string
  assignedUsername?: string
  assignedFirstName?: string
  assignedAt?: string
}

export default function AdminRandyPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [schedules, setSchedules] = useState<RandySchedule[]>([])
  const [activeSchedule, setActiveSchedule] = useState<RandySchedule | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const [formData, setFormData] = useState({
    winnerCount: 10,
    distributionHours: 24,
    prizeText: '',
    sendAnnouncement: true,
    pinMessage: true,
    onePerUser: true,
    minMessages: 0,
    messagePeriod: 'none'
  })

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin')
      return
    }
    loadSchedules()
  }, [])

  async function loadSchedules() {
    try {
      const response = await fetch('/api/admin/randy?includeSlots=true')
      const data = await response.json()
      setSchedules(data.schedules || [])

      const active = data.schedules.find((s: RandySchedule) => s.status === 'active')
      setActiveSchedule(active || null)
    } catch (error) {
      console.error('Error loading schedules:', error)
      toast.error('Randy planları yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateSchedule(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.prizeText) {
      toast.error('Ödül açıklaması gerekli')
      return
    }

    if (activeSchedule) {
      toast.error('Zaten aktif bir randy planı var. Önce onu tamamlayın veya iptal edin.')
      return
    }

    try {
      const response = await fetch('/api/admin/randy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (data.schedule) {
        toast.success('Randy planı oluşturuldu!')
        loadSchedules()
        // Form sıfırla
        setFormData({
          ...formData,
          prizeText: ''
        })
      } else {
        toast.error(data.error || 'Oluşturma başarısız')
      }
    } catch (error) {
      console.error('Create error:', error)
      toast.error('Bir hata oluştu')
    }
  }

  async function handleStatusChange(id: string, newStatus: string) {
    try {
      const response = await fetch(`/api/admin/randy/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      const data = await response.json()

      if (data.schedule) {
        toast.success('Durum güncellendi')
        loadSchedules()
      } else {
        toast.error(data.error || 'Güncelleme başarısız')
      }
    } catch (error) {
      console.error('Status change error:', error)
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
      const response = await fetch(`/api/admin/randy/${deleteId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Randy planı silindi')
        loadSchedules()
      } else {
        toast.error(data.error || 'Silme başarısız')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Bir hata oluştu')
    } finally {
      setConfirmOpen(false)
      setDeleteId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  const assignedCount = activeSchedule?.slots?.filter(s => s.assigned).length || 0
  const totalCount = activeSchedule?.slots?.length || 0
  const progress = totalCount > 0 ? (assignedCount / totalCount) * 100 : 0

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin/dashboard">
            <Button variant="outline" className="mb-4 border-white/20 hover:bg-white/10">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Geri
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-purple-400" />
            Randy Sistemi
          </h1>
          <p className="text-gray-400 mt-1">Rastgele ödül dağıtım sistemi</p>
        </div>

        <Tabs defaultValue="create" className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="create" className="data-[state=active]:bg-purple-600">
              <Plus className="w-4 h-4 mr-2" />
              Oluşturma ve Ayarlar
            </TabsTrigger>
            <TabsTrigger value="active" className="data-[state=active]:bg-purple-600">
              <Sparkles className="w-4 h-4 mr-2" />
              Aktif Randy
            </TabsTrigger>
          </TabsList>

          {/* Oluşturma ve Ayarlar Tab */}
          <TabsContent value="create" className="space-y-6">
            <Card className="bg-white/5 border-white/10 p-6">
              <h2 className="text-xl font-bold text-white mb-6">Yeni Randy Planı Oluştur</h2>

              <form onSubmit={handleCreateSchedule} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="winnerCount" className="text-white">Kazanan Sayısı</Label>
                    <Input
                      id="winnerCount"
                      type="number"
                      min="1"
                      value={formData.winnerCount}
                      onChange={(e) => setFormData({ ...formData, winnerCount: parseInt(e.target.value) })}
                      className="bg-white/5 border-white/10 text-white mt-2"
                      required
                    />
                    <p className="text-xs text-gray-400 mt-1">Kaç kişiye ödül dağıtılacak</p>
                  </div>

                  <div>
                    <Label htmlFor="distributionHours" className="text-white">Dağıtım Süresi (Saat)</Label>
                    <Input
                      id="distributionHours"
                      type="number"
                      min="1"
                      value={formData.distributionHours}
                      onChange={(e) => setFormData({ ...formData, distributionHours: parseInt(e.target.value) })}
                      className="bg-white/5 border-white/10 text-white mt-2"
                      required
                    />
                    <p className="text-xs text-gray-400 mt-1">Ödüller kaç saat içinde dağıtılacak</p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="prizeText" className="text-white">Ödül Açıklaması</Label>
                  <Textarea
                    id="prizeText"
                    value={formData.prizeText}
                    onChange={(e) => setFormData({ ...formData, prizeText: e.target.value })}
                    className="bg-white/5 border-white/10 text-white mt-2"
                    placeholder="Örn: 100 TL, 50 Puan, VIP Üyelik vs."
                    rows={3}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="minMessages" className="text-white">Minimum Mesaj Sayısı</Label>
                    <Input
                      id="minMessages"
                      type="number"
                      min="0"
                      value={formData.minMessages}
                      onChange={(e) => setFormData({ ...formData, minMessages: parseInt(e.target.value) })}
                      className="bg-white/5 border-white/10 text-white mt-2"
                    />
                    <p className="text-xs text-gray-400 mt-1">0 = sınırsız</p>
                  </div>

                  <div>
                    <Label htmlFor="messagePeriod" className="text-white">Mesaj Dönemi</Label>
                    <Select
                      value={formData.messagePeriod}
                      onValueChange={(value) => setFormData({ ...formData, messagePeriod: value })}
                    >
                      <SelectTrigger className="bg-white/5 border-white/10 text-white mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/20">
                        <SelectItem value="none">Kontrol Yok</SelectItem>
                        <SelectItem value="today">Bugün</SelectItem>
                        <SelectItem value="week">Bu Hafta</SelectItem>
                        <SelectItem value="all">Tüm Zamanlar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4 border-t border-white/10 pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-white">Kazananı Grupta Duyur</Label>
                      <p className="text-xs text-gray-400">Kazanan kullanıcı grupta etiketlenecek</p>
                    </div>
                    <Switch
                      checked={formData.sendAnnouncement}
                      onCheckedChange={(checked) => setFormData({ ...formData, sendAnnouncement: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-white">Mesajı Sabitle</Label>
                      <p className="text-xs text-gray-400">Kazanan duyurusu sabitlenecek</p>
                    </div>
                    <Switch
                      checked={formData.pinMessage}
                      onCheckedChange={(checked) => setFormData({ ...formData, pinMessage: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-white">Kullanıcı Başına Bir Kez</Label>
                      <p className="text-xs text-gray-400">Her kullanıcı sadece bir kez kazanabilir</p>
                    </div>
                    <Switch
                      checked={formData.onePerUser}
                      onCheckedChange={(checked) => setFormData({ ...formData, onePerUser: checked })}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-semibold py-6"
                  disabled={!!activeSchedule}
                >
                  {activeSchedule ? 'Zaten Aktif Plan Var' : 'Randy Planı Oluştur'}
                </Button>
              </form>
            </Card>

            {/* Mesaj Şablonları Bilgisi */}
            <Card className="bg-blue-500/10 border-blue-500/30 p-6">
              <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                <Gift className="w-5 h-5 text-blue-400" />
                Mesaj Şablonları
              </h3>
              <p className="text-gray-300 text-sm mb-3">
                Randy mesaj şablonlarını <Link href="/admin/settings" className="text-blue-400 underline">Sistem Ayarları</Link> sayfasından düzenleyebilirsiniz:
              </p>
              <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
                <li><code className="text-blue-300">randy_dm_template</code> - Kazanana gönderilecek özel mesaj</li>
                <li><code className="text-blue-300">randy_group_template</code> - Grupta paylaşılacak duyuru mesajı</li>
              </ul>
            </Card>
          </TabsContent>

          {/* Aktif Randy Tab */}
          <TabsContent value="active" className="space-y-6">
            {!activeSchedule ? (
              <Card className="bg-white/5 border-white/10 p-12 text-center">
                <Sparkles className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">Aktif randy planı yok</p>
              </Card>
            ) : (
              <>
                {/* Progress Card */}
                <Card className="bg-gradient-to-br from-purple-500/20 to-pink-600/20 border-purple-500/30 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-white">
                        {activeSchedule.prizeText}
                      </h2>
                      <p className="text-gray-300 text-sm mt-1">
                        {new Date(activeSchedule.startTime).toLocaleString('tr-TR')} - {activeSchedule.distributionHours} saat
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-4xl font-bold text-white">{assignedCount}/{totalCount}</p>
                      <p className="text-sm text-gray-300">Dağıtıldı</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-white/10 rounded-full h-4 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-600 transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-center text-white font-semibold mt-2">{progress.toFixed(1)}%</p>

                  {/* Actions */}
                  <div className="flex gap-3 mt-6">
                    <Button
                      onClick={() => handleStatusChange(activeSchedule.id, 'completed')}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Tamamla
                    </Button>
                    <Button
                      onClick={() => handleStatusChange(activeSchedule.id, 'cancelled')}
                      variant="outline"
                      className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      İptal Et
                    </Button>
                  </div>
                </Card>

                {/* Ayarlar */}
                <Card className="bg-white/5 border-white/10 p-6">
                  <h3 className="text-white font-bold mb-4">Plan Ayarları</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-white/5 rounded-lg">
                      <p className="text-xs text-gray-400">Duyuru</p>
                      <p className="text-white font-semibold">{activeSchedule.sendAnnouncement ? 'Evet' : 'Hayır'}</p>
                    </div>
                    <div className="p-3 bg-white/5 rounded-lg">
                      <p className="text-xs text-gray-400">Sabitle</p>
                      <p className="text-white font-semibold">{activeSchedule.pinMessage ? 'Evet' : 'Hayır'}</p>
                    </div>
                    <div className="p-3 bg-white/5 rounded-lg">
                      <p className="text-xs text-gray-400">Bir Kez</p>
                      <p className="text-white font-semibold">{activeSchedule.onePerUser ? 'Evet' : 'Hayır'}</p>
                    </div>
                    <div className="p-3 bg-white/5 rounded-lg">
                      <p className="text-xs text-gray-400">Min. Mesaj</p>
                      <p className="text-white font-semibold">{activeSchedule.minMessages || 'Yok'}</p>
                    </div>
                  </div>
                </Card>

                {/* Slots List */}
                <Card className="bg-white/5 border-white/10 p-6">
                  <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Zaman Slotları
                  </h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {activeSchedule.slots?.map((slot, index) => (
                      <div
                        key={slot.id}
                        className={`p-3 rounded-lg border ${
                          slot.assigned
                            ? 'bg-green-500/10 border-green-500/30'
                            : 'bg-white/5 border-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl font-bold text-white">#{index + 1}</span>
                            <div>
                              <p className="text-white font-semibold">
                                {new Date(slot.schedTime).toLocaleTimeString('tr-TR', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                              <p className="text-xs text-gray-400">
                                {new Date(slot.schedTime).toLocaleDateString('tr-TR')}
                              </p>
                            </div>
                          </div>

                          {slot.assigned ? (
                            <div className="text-right">
                              <p className="text-green-400 font-semibold">
                                {slot.assignedFirstName || slot.assignedUsername || 'Kullanıcı'}
                              </p>
                              <p className="text-xs text-gray-400">
                                {slot.assignedAt && new Date(slot.assignedAt).toLocaleString('tr-TR')}
                              </p>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">Bekliyor...</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </>
            )}

            {/* Geçmiş Planlar */}
            <Card className="bg-white/5 border-white/10 p-6">
              <h3 className="text-white font-bold mb-4">Geçmiş Planlar</h3>
              <div className="space-y-3">
                {schedules.filter(s => s.status !== 'active').length === 0 ? (
                  <p className="text-gray-400 text-center py-8">Geçmiş plan yok</p>
                ) : (
                  schedules.filter(s => s.status !== 'active').map((schedule) => (
                    <div key={schedule.id} className="p-4 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="text-white font-semibold">{schedule.prizeText}</h4>
                          <p className="text-sm text-gray-400">
                            {new Date(schedule.startTime).toLocaleDateString('tr-TR')} • {schedule.winnerCount} kazanan
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            schedule.status === 'completed'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {schedule.status === 'completed' ? 'Tamamlandı' : 'İptal'}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(schedule.id)}
                            className="border-red-500/20 text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Randy Planını Sil"
        description="Bu randy planını silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
        onConfirm={confirmDelete}
      />
    </div>
  )
}
