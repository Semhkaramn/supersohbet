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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ArrowLeft, Sparkles, Plus, Clock, Users, Gift, CheckCircle, XCircle, Trash2, Settings } from 'lucide-react'
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

interface TelegramAdmin {
  userId: number
  firstName: string
  lastName?: string
  username?: string
}

export default function AdminRandyPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [schedules, setSchedules] = useState<RandySchedule[]>([])
  const [activeSchedule, setActiveSchedule] = useState<RandySchedule | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  // Kazananları gönderme için state
  const [sendWinnersDialogOpen, setSendWinnersDialogOpen] = useState(false)
  const [selectedScheduleForSend, setSelectedScheduleForSend] = useState<RandySchedule | null>(null)
  const [selectedAdminTelegramId, setSelectedAdminTelegramId] = useState<string>('')
  const [sendingWinners, setSendingWinners] = useState(false)
  const [admins, setAdmins] = useState<TelegramAdmin[]>([])

  // Geçmiş planlar için expanded state
  const [expandedScheduleId, setExpandedScheduleId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    winnerCount: 10,
    distributionHours: 24,
    prizeText: '',
    minMessages: 0,
    messagePeriod: 'none'
  })

  // Randy ayarları
  const [randySettings, setRandySettings] = useState({
    randy_dm_template: '',
    randy_group_template: '',
    randy_start_template: '',
    randy_send_dm: 'true',
    randy_send_announcement: 'true',
    randy_pin_start_message: 'true',
    randy_pin_winner_message: 'true',
    randy_one_per_user: 'true'
  })
  const [savingSettings, setSavingSettings] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin')
      return
    }
    loadSchedules()
    loadRandySettings()
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

  async function loadRandySettings() {
    try {
      const response = await fetch('/api/admin/settings')
      const data = await response.json()
      const settings = data.settings || []

      const randyKeys = [
        'randy_dm_template',
        'randy_group_template',
        'randy_start_template',
        'randy_send_dm',
        'randy_send_announcement',
        'randy_pin_start_message',
        'randy_pin_winner_message',
        'randy_one_per_user'
      ]

      const newSettings: any = {}
      for (const key of randyKeys) {
        const setting = settings.find((s: any) => s.key === key)
        if (setting) {
          newSettings[key] = setting.value
        }
      }
      setRandySettings({ ...randySettings, ...newSettings })
    } catch (error) {
      console.error('Error loading randy settings:', error)
    }
  }

  async function loadAdmins() {
    try {
      const response = await fetch('/api/admin/randy/get-group-admins')
      const data = await response.json()
      if (data.error) {
        toast.error(data.error)
        setAdmins([])
      } else {
        setAdmins(data.admins || [])
      }
    } catch (error) {
      console.error('Error loading admins:', error)
      toast.error('Adminler yüklenemedi')
      setAdmins([])
    }
  }

  async function sendWinnersToAdmin(schedule: RandySchedule) {
    if (!selectedAdminTelegramId) {
      toast.error('Lütfen bir admin seçin')
      return
    }

    setSendingWinners(true)
    try {
      const winners = schedule.slots?.filter(s => s.assigned) || []

      if (winners.length === 0) {
        toast.error('Bu planda henüz kazanan yok')
        setSendingWinners(false)
        return
      }

      // Kazananları formatlayarak mesaj oluştur
      let message = `🎉 **Randy Kazananları**\n\n`
      message += `📋 **Plan:** ${schedule.prizeText}\n`
      message += `📅 **Tarih:** ${new Date(schedule.startTime).toLocaleDateString('tr-TR')}\n`
      message += `🏆 **Toplam Kazanan:** ${winners.length}\n\n`
      message += `**Kazananlar:**\n`

      winners.forEach((winner, index) => {
        const name = winner.assignedUsername ? `@${winner.assignedUsername}` : winner.assignedFirstName || 'Kullanıcı'
        message += `${index + 1}. ${name} - 🎁 ${schedule.prizeText}\n`
      })

      // Telegram üzerinden mesaj gönder
      const response = await fetch('/api/admin/randy/send-winners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminTelegramId: selectedAdminTelegramId,
          message: message
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Kazananlar admin\'e gönderildi!')
        setSendWinnersDialogOpen(false)
        setSelectedScheduleForSend(null)
        setSelectedAdminTelegramId('')
      } else {
        toast.error(data.error || 'Mesaj gönderilemedi')
      }
    } catch (error) {
      console.error('Send winners error:', error)
      toast.error('Bir hata oluştu')
    } finally {
      setSendingWinners(false)
    }
  }

  function openSendWinnersDialog(schedule: RandySchedule) {
    setSelectedScheduleForSend(schedule)
    setSendWinnersDialogOpen(true)
    loadAdmins()
  }

  async function saveRandySettings() {
    setSavingSettings(true)
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: randySettings })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Randy ayarları kaydedildi')
      } else {
        toast.error(data.error || 'Ayarlar kaydedilemedi')
      }
    } catch (error) {
      console.error('Error saving randy settings:', error)
      toast.error('Bir hata oluştu')
    } finally {
      setSavingSettings(false)
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
        body: JSON.stringify({
          ...formData,
          onePerUser: randySettings.randy_one_per_user === 'true'
        })
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
              Yeni Randy Oluştur
            </TabsTrigger>
            <TabsTrigger value="active" className="data-[state=active]:bg-purple-600">
              <Sparkles className="w-4 h-4 mr-2" />
              Aktif Randy
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-purple-600">
              <Settings className="w-4 h-4 mr-2" />
              Ayarlar ve Şablonlar
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
                    <Label htmlFor="messagePeriod" className="text-white">Mesaj Dönemi Kontrolü</Label>
                    <Select
                      value={formData.messagePeriod}
                      onValueChange={(value) => {
                        setFormData({ ...formData, messagePeriod: value, minMessages: value === 'none' ? 0 : formData.minMessages })
                      }}
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
                    <p className="text-xs text-gray-400 mt-1">Kazananların hangi dönemde mesaj yazmış olması gerektiği</p>
                  </div>

                  {formData.messagePeriod !== 'none' && (
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
                      <p className="text-xs text-gray-400 mt-1">Seçilen dönemde en az kaç mesaj yazmış olmalı (0 = sınırsız)</p>
                    </div>
                  )}
                </div>

                <div className="space-y-4 border-t border-white/10 pt-6">
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <p className="text-xs text-blue-300">
                      💡 <strong>Not:</strong> Randy başlangıç duyurusu gönderme, sabitleme ve "kullanıcı başına bir kez" ayarları "Ayarlar ve Şablonlar" sekmesinden kontrol ediliyor.
                    </p>
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

            {/* Bilgi Kartı */}
            <Card className="bg-blue-500/10 border-blue-500/30 p-6">
              <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                <Gift className="w-5 h-5 text-blue-400" />
                Randy Nasıl Çalışır?
              </h3>
              <ul className="text-sm text-gray-300 space-y-2 list-disc list-inside">
                <li>Randy planı oluşturduktan sonra otomatik olarak rastgele zamanlarda kazananlar seçilir</li>
                <li>Kazananlar sadece /start yapmış ve yasaklanmamış kullanıcılar arasından seçilir</li>
                <li>Mesaj şablonlarını ve diğer ayarları "Ayarlar ve Şablonlar" sekmesinden düzenleyebilirsiniz</li>
                <li>Kazananlara otomatik DM gönderilebilir ve grupta duyuru yapılabilir</li>
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
                      onClick={() => openSendWinnersDialog(activeSchedule)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                      disabled={assignedCount === 0}
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Kazananları Gönder
                    </Button>
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
                  schedules.filter(s => s.status !== 'active').map((schedule) => {
                    const isExpanded = expandedScheduleId === schedule.id
                    const winnersCount = schedule.slots?.filter(s => s.assigned).length || 0

                    return (
                      <div key={schedule.id} className="bg-white/5 rounded-lg border border-white/10">
                        <div className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="text-white font-semibold">{schedule.prizeText}</h4>
                              <p className="text-sm text-gray-400">
                                {new Date(schedule.startTime).toLocaleDateString('tr-TR')} • {winnersCount}/{schedule.winnerCount} kazanan
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

                              {winnersCount > 0 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openSendWinnersDialog(schedule)}
                                  className="border-blue-500/20 text-blue-400 hover:bg-blue-500/10"
                                >
                                  <Users className="w-4 h-4" />
                                </Button>
                              )}

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setExpandedScheduleId(isExpanded ? null : schedule.id)}
                                className="border-white/20 text-white hover:bg-white/10"
                              >
                                {isExpanded ? '▼' : '►'}
                              </Button>

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

                        {/* Detaylar */}
                        {isExpanded && (
                          <div className="border-t border-white/10 p-4 space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div className="p-3 bg-white/5 rounded-lg">
                                <p className="text-xs text-gray-400">Başlangıç</p>
                                <p className="text-white text-sm font-medium">
                                  {new Date(schedule.startTime).toLocaleString('tr-TR')}
                                </p>
                              </div>
                              <div className="p-3 bg-white/5 rounded-lg">
                                <p className="text-xs text-gray-400">Süre</p>
                                <p className="text-white text-sm font-medium">{schedule.distributionHours} saat</p>
                              </div>
                              <div className="p-3 bg-white/5 rounded-lg">
                                <p className="text-xs text-gray-400">Bir Kez</p>
                                <p className="text-white text-sm font-medium">{schedule.onePerUser ? 'Evet' : 'Hayır'}</p>
                              </div>
                              <div className="p-3 bg-white/5 rounded-lg">
                                <p className="text-xs text-gray-400">Min. Mesaj</p>
                                <p className="text-white text-sm font-medium">{schedule.minMessages || 'Yok'}</p>
                              </div>
                            </div>

                            {/* Kazananlar Listesi */}
                            {winnersCount > 0 && (
                              <div>
                                <h5 className="text-white font-semibold mb-3 flex items-center gap-2">
                                  <Gift className="w-4 h-4 text-yellow-400" />
                                  Kazananlar ({winnersCount})
                                </h5>
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                  {schedule.slots?.filter(s => s.assigned).map((slot, index) => (
                                    <div key={slot.id} className="p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <p className="text-white font-medium">
                                            {index + 1}. {slot.assignedUsername ? `@${slot.assignedUsername}` : slot.assignedFirstName || 'Kullanıcı'}
                                          </p>
                                          <p className="text-xs text-gray-400">
                                            {slot.assignedAt && new Date(slot.assignedAt).toLocaleString('tr-TR')}
                                          </p>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-xs text-gray-400">Telegram ID</p>
                                          <p className="text-white text-sm font-mono">{slot.assignedUser}</p>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Ayarlar ve Şablonlar Tab */}
          <TabsContent value="settings" className="space-y-6">
            {/* Mesaj Şablonları */}
            <Card className="bg-white/5 border-white/10 p-6">
              <h2 className="text-xl font-bold text-white mb-6">Mesaj Şablonları</h2>
              <div className="space-y-6">
                <div>
                  <Label htmlFor="randy_dm_template" className="text-white">
                    Randy Kazanan DM Şablonu
                  </Label>
                  <p className="text-xs text-gray-400 mb-2">
                    Kazanana gönderilecek özel mesaj. Kullanılabilir: {'{firstname}'}, {'{username}'}, {'{prize}'}
                  </p>
                  <Textarea
                    id="randy_dm_template"
                    value={randySettings.randy_dm_template}
                    onChange={(e) => setRandySettings({ ...randySettings, randy_dm_template: e.target.value })}
                    className="bg-white/5 border-white/10 text-white font-mono text-sm"
                    rows={8}
                    placeholder="🎉 Tebrikler! Randy Kazandınız!..."
                  />
                </div>

                <div>
                  <Label htmlFor="randy_group_template" className="text-white">
                    Randy Kazanan Grup Duyurusu Şablonu
                  </Label>
                  <p className="text-xs text-gray-400 mb-2">
                    Grupta paylaşılacak duyuru mesajı. Kullanılabilir: {'{mention}'}, {'{username}'}, {'{firstname}'}, {'{prize}'}
                  </p>
                  <Textarea
                    id="randy_group_template"
                    value={randySettings.randy_group_template}
                    onChange={(e) => setRandySettings({ ...randySettings, randy_group_template: e.target.value })}
                    className="bg-white/5 border-white/10 text-white font-mono text-sm"
                    rows={6}
                    placeholder="🎉 Randy Kazananı! {mention} tebrikler!..."
                  />
                </div>

                <div>
                  <Label htmlFor="randy_start_template" className="text-white">
                    Randy Başlangıç Duyurusu Şablonu
                  </Label>
                  <p className="text-xs text-gray-400 mb-2">
                    Randy başladığında gönderilecek mesaj. Kullanılabilir: {'{prize}'}, {'{winners}'}, {'{hours}'}, {'{endtime}'}
                  </p>
                  <Textarea
                    id="randy_start_template"
                    value={randySettings.randy_start_template}
                    onChange={(e) => setRandySettings({ ...randySettings, randy_start_template: e.target.value })}
                    className="bg-white/5 border-white/10 text-white font-mono text-sm"
                    rows={8}
                    placeholder="🎊 Randy Başladı!..."
                  />
                </div>
              </div>
            </Card>

            {/* Randy Ayarları */}
            <Card className="bg-white/5 border-white/10 p-6">
              <h2 className="text-xl font-bold text-white mb-6">Randy Genel Ayarları</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-white">Kazanana DM Gönder</Label>
                    <p className="text-xs text-gray-400">Kazanan kullanıcıya özel mesaj gönderilecek (sadece /start yapmış kullanıcılara)</p>
                  </div>
                  <Switch
                    checked={randySettings.randy_send_dm === 'true'}
                    onCheckedChange={(checked) => setRandySettings({ ...randySettings, randy_send_dm: checked ? 'true' : 'false' })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-white">Kazananı Grupta Duyur</Label>
                    <p className="text-xs text-gray-400">Kazanan kullanıcı grupta etiketlenecek</p>
                  </div>
                  <Switch
                    checked={randySettings.randy_send_announcement === 'true'}
                    onCheckedChange={(checked) => setRandySettings({ ...randySettings, randy_send_announcement: checked ? 'true' : 'false' })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-white">Başlangıç Duyurusunu Sabitle</Label>
                    <p className="text-xs text-gray-400">Randy başlangıç duyurusu mesajı sabitlenecek</p>
                  </div>
                  <Switch
                    checked={randySettings.randy_pin_start_message === 'true'}
                    onCheckedChange={(checked) => setRandySettings({ ...randySettings, randy_pin_start_message: checked ? 'true' : 'false' })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-white">Kazanan Duyurusunu Sabitle</Label>
                    <p className="text-xs text-gray-400">Kazanan duyurusu mesajı sabitlenecek</p>
                  </div>
                  <Switch
                    checked={randySettings.randy_pin_winner_message === 'true'}
                    onCheckedChange={(checked) => setRandySettings({ ...randySettings, randy_pin_winner_message: checked ? 'true' : 'false' })}
                  />
                </div>

                <div className="flex items-center justify-between border-t border-white/10 pt-4">
                  <div>
                    <Label className="text-white">Kullanıcı Başına Bir Kez</Label>
                    <p className="text-xs text-gray-400">Her kullanıcı bir Randy planında sadece bir kez kazanabilir</p>
                  </div>
                  <Switch
                    checked={randySettings.randy_one_per_user === 'true'}
                    onCheckedChange={(checked) => setRandySettings({ ...randySettings, randy_one_per_user: checked ? 'true' : 'false' })}
                  />
                </div>
              </div>

              <Button
                onClick={saveRandySettings}
                disabled={savingSettings}
                className="w-full mt-6 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-semibold py-6"
              >
                {savingSettings ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
              </Button>
            </Card>

            {/* Bilgi Kartı */}
            <Card className="bg-blue-500/10 border-blue-500/30 p-6">
              <h3 className="text-white font-bold mb-3">💡 Mesaj Şablonları Hakkında</h3>
              <div className="text-sm text-gray-300 space-y-2">
                <p><strong>Kullanılabilir Değişkenler:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><code className="text-blue-300">{'{firstname}'}</code> - Kullanıcının adı</li>
                  <li><code className="text-blue-300">{'{username}'}</code> - Kullanıcının kullanıcı adı</li>
                  <li><code className="text-blue-300">{'{mention}'}</code> - Kullanıcı mention (@username veya ad)</li>
                  <li><code className="text-blue-300">{'{prize}'}</code> - Ödül açıklaması</li>
                  <li><code className="text-blue-300">{'{winners}'}</code> - Toplam kazanan sayısı</li>
                  <li><code className="text-blue-300">{'{hours}'}</code> - Dağıtım süresi (saat)</li>
                  <li><code className="text-blue-300">{'{endtime}'}</code> - Bitiş zamanı</li>
                </ul>
                <p className="mt-3"><strong>Not:</strong> DM sadece bota /start yapmış kullanıcılara gönderilebilir.</p>
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

      {/* Kazananları Gönderme Dialog */}
      <Dialog open={sendWinnersDialogOpen} onOpenChange={setSendWinnersDialogOpen}>
        <DialogContent className="bg-slate-900 border-white/20">
          <DialogHeader>
            <DialogTitle className="text-white">Kazananları Admin'e Gönder</DialogTitle>
            <DialogDescription className="text-gray-300">
              {selectedScheduleForSend && (
                <>
                  <p className="mb-2">🎉 <strong>{selectedScheduleForSend.prizeText}</strong> planındaki kazananları admin'e gönderin.</p>
                  <p className="text-sm text-gray-400">
                    Toplam kazanan: {selectedScheduleForSend.slots?.filter(s => s.assigned).length || 0}
                  </p>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="adminTelegramId" className="text-white">Grup Admini Seçin</Label>
              {admins.length === 0 ? (
                <div className="mt-2 p-3 bg-white/5 border border-white/10 rounded-md text-gray-400 text-sm">
                  Adminler yükleniyor...
                </div>
              ) : (
                <Select value={selectedAdminTelegramId} onValueChange={setSelectedAdminTelegramId}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white mt-2">
                    <SelectValue placeholder="Bir admin seçin" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-white/20">
                    {admins.map((admin) => (
                      <SelectItem
                        key={admin.userId}
                        value={admin.userId.toString()}
                        className="text-white hover:bg-white/10"
                      >
                        {admin.firstName} {admin.lastName || ''}
                        {admin.username && ` (@${admin.username})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-gray-400 mt-1">
                Kazananların listesi seçilen admin'e Telegram üzerinden gönderilecek
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSendWinnersDialogOpen(false)}
              className="bg-white/5 border-white/10 text-white hover:bg-white/10"
              disabled={sendingWinners}
            >
              İptal
            </Button>
            <Button
              onClick={() => selectedScheduleForSend && sendWinnersToAdmin(selectedScheduleForSend)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={sendingWinners || !selectedAdminTelegramId}
            >
              {sendingWinners ? 'Gönderiliyor...' : 'Gönder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
