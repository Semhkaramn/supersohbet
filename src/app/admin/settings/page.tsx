'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Settings, Save, MessageSquare, Plus, Edit, Trash2, ArrowLeft, Power, PowerOff } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface Setting {
  id: string
  key: string
  value: string
  description: string
  category: string
}

interface Channel {
  id: string
  channelId: string
  channelName: string
  channelLink: string
  channelType: string
  isActive: boolean
  order: number
}

export default function AdminSettingsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<Setting[]>([])
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [maintenanceMode, setMaintenanceMode] = useState(false)

  const [channelDialogOpen, setChannelDialogOpen] = useState(false)
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null)
  const [channelFormData, setChannelFormData] = useState({
    channelId: '',
    channelName: '',
    channelLink: '',
    channelType: 'channel',
    order: 0
  })

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin')
      return
    }
    loadSettings()
    loadChannels()
  }, [])

  async function loadSettings() {
    try {
      const response = await fetch('/api/admin/settings')
      const data = await response.json()
      setSettings(data.settings || [])

      // Bakım modunu ayarla
      const maintenanceSetting = data.settings.find((s: Setting) => s.key === 'maintenance_mode')
      setMaintenanceMode(maintenanceSetting?.value === 'true')
    } catch (error) {
      console.error('Error loading settings:', error)
      toast.error('Ayarlar yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  async function loadChannels() {
    try {
      const response = await fetch('/api/admin/channels')
      const data = await response.json()
      setChannels(data.channels || [])
    } catch (error) {
      console.error('Error loading channels:', error)
      toast.error('Kanallar yüklenemedi')
    }
  }

  async function saveSetting(key: string, value: string) {
    setSaving(true)
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      })

      const data = await response.json()

      if (data.success) {
        if (key === 'telegram_bot_token' && data.webhookSet) {
          toast.success(`Bot başarıyla bağlandı! @${data.botUsername}`)
        } else {
          toast.success('Ayar kaydedildi!')
        }
        loadSettings()
      } else {
        toast.error(data.error || 'Ayar kaydedilemedi')
      }
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Bir hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  async function toggleMaintenanceMode() {
    const newValue = !maintenanceMode
    setSaving(true)
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'maintenance_mode', value: newValue.toString() })
      })

      const data = await response.json()

      if (data.success) {
        setMaintenanceMode(newValue)
        toast.success(newValue ? 'Bakım modu aktif edildi' : 'Bakım modu kapatıldı')
        loadSettings()
      } else {
        toast.error(data.error || 'Ayar kaydedilemedi')
      }
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Bir hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  function handleInputChange(key: string, value: string) {
    setSettings(prev =>
      prev.map(s => s.key === key ? { ...s, value } : s)
    )
  }

  function getSetting(key: string) {
    return settings.find(s => s.key === key)
  }

  // Kanal dialog fonksiyonları
  function openChannelDialog(channel?: Channel) {
    if (channel) {
      setEditingChannel(channel)
      setChannelFormData({
        channelId: channel.channelId,
        channelName: channel.channelName,
        channelLink: channel.channelLink,
        channelType: channel.channelType,
        order: channel.order
      })
    } else {
      setEditingChannel(null)
      setChannelFormData({
        channelId: '',
        channelName: '',
        channelLink: '',
        channelType: 'channel',
        order: channels.length
      })
    }
    setChannelDialogOpen(true)
  }

  async function handleChannelSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      const url = editingChannel
        ? `/api/admin/channels/${editingChannel.id}`
        : '/api/admin/channels'

      const method = editingChannel ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(channelFormData)
      })

      const data = await response.json()

      if (data.success || data.channel) {
        toast.success(editingChannel ? 'Kanal güncellendi' : 'Kanal eklendi')
        setChannelDialogOpen(false)
        loadChannels()
      } else {
        toast.error(data.error || 'İşlem başarısız')
      }
    } catch (error) {
      console.error('Submit error:', error)
      toast.error('Bir hata oluştu')
    }
  }

  async function handleChannelDelete(id: string) {
    if (!confirm('Bu kanalı silmek istediğinizden emin misiniz?')) return

    try {
      const response = await fetch(`/api/admin/channels/${id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Kanal silindi')
        loadChannels()
      } else {
        toast.error(data.error || 'Silme başarısız')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Bir hata oluştu')
    }
  }

  async function toggleChannelActive(id: string, currentActive: boolean) {
    try {
      const response = await fetch(`/api/admin/channels/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive })
      })

      const data = await response.json()

      if (data.success || data.channel) {
        toast.success('Durum güncellendi')
        loadChannels()
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

  // Ayarları kategorilere göre grupla
  const botToken = getSetting('telegram_bot_token')
  const pointsPerMessage = getSetting('points_per_message')
  const xpPerMessage = getSetting('xp_per_message')
  const messagesForXp = getSetting('messages_for_xp')
  const minMessageLength = getSetting('min_message_length')
  const messageCooldown = getSetting('message_cooldown_seconds')
  const wheelSpinCost = getSetting('wheel_spin_cost')
  const dailyWheelSpins = getSetting('daily_wheel_spins')
  const referralBonusInviter = getSetting('referral_bonus_inviter')
  const referralBonusInvited = getSetting('referral_bonus_invited')
  const cloudinaryCloudName = getSetting('cloudinary_cloud_name')
  const cloudinaryApiKey = getSetting('cloudinary_api_key')
  const cloudinaryApiSecret = getSetting('cloudinary_api_secret')
  const activityGroupId = getSetting('activity_group_id')

  // Sadece grup tipindeki kanalları filtrele
  const groupChannels = channels.filter(ch => ch.channelType === 'group')

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <Link href="/admin/dashboard">
            <Button variant="outline" className="mb-4 border-white/20 hover:bg-white/10">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Geri
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                <Settings className="w-8 h-8" />
                Sistem Ayarları
              </h1>
              <p className="text-gray-400 mt-1">Bot davranışlarını ve sistem parametrelerini yönetin</p>
            </div>

            {/* Bakım Modu Toggle */}
            <Button
              onClick={toggleMaintenanceMode}
              disabled={saving}
              className={`${maintenanceMode ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
              size="lg"
            >
              {maintenanceMode ? (
                <><PowerOff className="w-5 h-5 mr-2" /> Bakım Modu Aktif</>
              ) : (
                <><Power className="w-5 h-5 mr-2" /> Bakım Modu Kapalı</>
              )}
            </Button>
          </div>
        </div>

        {/* Bakım Modu Uyarısı */}
        {maintenanceMode && (
          <Card className="bg-red-500/10 border-red-500/30 p-4">
            <div className="flex items-start gap-3">
              <PowerOff className="w-6 h-6 text-red-400 mt-0.5" />
              <div>
                <h3 className="text-red-300 font-semibold mb-1">Bakım Modu Aktif</h3>
                <p className="text-red-200 text-sm">
                  Kullanıcılar bota erişemez ve giriş ekranında bakım mesajı görür.
                  Bu modda puan kazanma, görev tamamlama gibi tüm aktiviteler devre dışıdır.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Telegram Bot Ayarları */}
        <Card className="bg-white/5 border-white/10 p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            📱 Telegram Bot Ayarları
          </h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="bot_token" className="text-white text-base">Telegram Bot Token</Label>
              <p className="text-xs text-gray-400 mb-2">@BotFather'dan alınan bot token'ı</p>
              <div className="flex gap-2">
                <Input
                  id="bot_token"
                  value={botToken?.value || ''}
                  onChange={(e) => handleInputChange('telegram_bot_token', e.target.value)}
                  className="bg-white/10 border-white/20 text-white flex-1"
                  placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                  type="password"
                />
                <Button
                  onClick={() => saveSetting('telegram_bot_token', botToken?.value || '')}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="w-4 h-4 mr-1" />
                  Kaydet
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Kanal Yönetimi */}
        <Card className="bg-white/5 border-white/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-6 h-6" />
              Zorunlu Kanallar
            </h2>
            <Button
              onClick={() => openChannelDialog()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Kanal Ekle
            </Button>
          </div>

          <div className="space-y-3">
            {channels.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Henüz kanal eklenmemiş</p>
            ) : (
              channels.map((channel) => (
                <div key={channel.id} className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-semibold text-white">{channel.channelName}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          channel.isActive
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {channel.isActive ? 'Aktif' : 'Pasif'}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          channel.channelType === 'group'
                            ? 'bg-purple-500/20 text-purple-400'
                            : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {channel.channelType === 'group' ? 'Grup' : 'Kanal'}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm">{channel.channelId}</p>
                      <a
                        href={channel.channelLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 text-sm hover:underline"
                      >
                        {channel.channelLink}
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleChannelActive(channel.id, channel.isActive)}
                        className="border-white/20 hover:bg-white/10"
                      >
                        {channel.isActive ? 'Devre Dışı' : 'Aktif Et'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openChannelDialog(channel)}
                        className="border-white/20 hover:bg-white/10"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleChannelDelete(channel.id)}
                        className="border-red-500/20 hover:bg-red-500/10 text-red-400"
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

        {/* Aktif Grup Seçimi */}
        <Card className="bg-white/5 border-white/10 p-6">
          <h2 className="text-xl font-bold text-white mb-4">💬 Aktif Grup Seçimi</h2>
          <div>
            <Label className="text-white text-base mb-2 block">Botun mesaj dinleyeceği grup</Label>
            <Select
              value={activityGroupId?.value || ''}
              onValueChange={(value) => saveSetting('activity_group_id', value)}
            >
              <SelectTrigger className="bg-white/10 border-white/20 text-white w-full">
                <SelectValue placeholder="Grup seçin" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/20">
                {groupChannels.length === 0 ? (
                  <div className="text-gray-400 px-4 py-2">Hiç grup eklenmemiş</div>
                ) : (
                  groupChannels.map((group) => (
                    <SelectItem key={group.channelId} value={group.channelId} className="text-white">
                      {group.channelName} <span className="text-xs text-gray-400 ml-2">{group.channelId}</span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-400 mt-1">
              Bot sadece burada seçili olan grupta mesaj dinler ve puan verir.
            </p>
          </div>
        </Card>

        {/* Puan ve XP Ayarları */}
        <Card className="bg-white/5 border-white/10 p-6">
          <h2 className="text-xl font-bold text-white mb-4">⭐ Puan ve XP Ayarları</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-white text-base">Mesaj Başına Puan</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={pointsPerMessage?.value || ''}
                    onChange={(e) => handleInputChange('points_per_message', e.target.value)}
                    className="bg-white/10 border-white/20 text-white"
                    type="number"
                  />
                  <Button
                    onClick={() => saveSetting('points_per_message', pointsPerMessage?.value || '')}
                    disabled={saving}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-white text-base">Mesaj Başına XP</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={xpPerMessage?.value || ''}
                    onChange={(e) => handleInputChange('xp_per_message', e.target.value)}
                    className="bg-white/10 border-white/20 text-white"
                    type="number"
                  />
                  <Button
                    onClick={() => saveSetting('xp_per_message', xpPerMessage?.value || '')}
                    disabled={saving}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-white text-base">XP için Mesaj Sayısı</Label>
                <p className="text-xs text-gray-400 mb-1">1 = Her mesajda XP</p>
                <div className="flex gap-2">
                  <Input
                    value={messagesForXp?.value || ''}
                    onChange={(e) => handleInputChange('messages_for_xp', e.target.value)}
                    className="bg-white/10 border-white/20 text-white"
                    type="number"
                  />
                  <Button
                    onClick={() => saveSetting('messages_for_xp', messagesForXp?.value || '')}
                    disabled={saving}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Mesaj Kısıtlamaları */}
        <Card className="bg-white/5 border-white/10 p-6">
          <h2 className="text-xl font-bold text-white mb-4">🚫 Mesaj Kısıtlamaları</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-white text-base">Min. Mesaj Uzunluğu</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={minMessageLength?.value || ''}
                  onChange={(e) => handleInputChange('min_message_length', e.target.value)}
                  className="bg-white/10 border-white/20 text-white"
                  type="number"
                />
                <Button
                  onClick={() => saveSetting('min_message_length', minMessageLength?.value || '')}
                  disabled={saving}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-white text-base">Mesaj Cooldown (saniye)</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={messageCooldown?.value || ''}
                  onChange={(e) => handleInputChange('message_cooldown_seconds', e.target.value)}
                  className="bg-white/10 border-white/20 text-white"
                  type="number"
                />
                <Button
                  onClick={() => saveSetting('message_cooldown_seconds', messageCooldown?.value || '')}
                  disabled={saving}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Çark Ayarları */}
        <Card className="bg-white/5 border-white/10 p-6">
          <h2 className="text-xl font-bold text-white mb-4">🎡 Şans Çarkı Ayarları</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-white text-base">Çark Çevirme Maliyeti (Puan)</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={wheelSpinCost?.value || ''}
                  onChange={(e) => handleInputChange('wheel_spin_cost', e.target.value)}
                  className="bg-white/10 border-white/20 text-white"
                  type="number"
                />
                <Button
                  onClick={() => saveSetting('wheel_spin_cost', wheelSpinCost?.value || '')}
                  disabled={saving}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-white text-base">Günlük Ücretsiz Çark Hakkı</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={dailyWheelSpins?.value || ''}
                  onChange={(e) => handleInputChange('daily_wheel_spins', e.target.value)}
                  className="bg-white/10 border-white/20 text-white"
                  type="number"
                />
                <Button
                  onClick={() => saveSetting('daily_wheel_spins', dailyWheelSpins?.value || '')}
                  disabled={saving}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Referans Sistemi */}
        <Card className="bg-white/5 border-white/10 p-6">
          <h2 className="text-xl font-bold text-white mb-4">👥 Referans Sistemi</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-white text-base">Davet Eden Kişi Bonusu</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={referralBonusInviter?.value || ''}
                  onChange={(e) => handleInputChange('referral_bonus_inviter', e.target.value)}
                  className="bg-white/10 border-white/20 text-white"
                  type="number"
                />
                <Button
                  onClick={() => saveSetting('referral_bonus_inviter', referralBonusInviter?.value || '')}
                  disabled={saving}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-white text-base">Davet Edilen Kişi Bonusu</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={referralBonusInvited?.value || ''}
                  onChange={(e) => handleInputChange('referral_bonus_invited', e.target.value)}
                  className="bg-white/10 border-white/20 text-white"
                  type="number"
                />
                <Button
                  onClick={() => saveSetting('referral_bonus_invited', referralBonusInvited?.value || '')}
                  disabled={saving}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Cloudinary Ayarları */}
        <Card className="bg-white/5 border-white/10 p-6">
          <h2 className="text-xl font-bold text-white mb-4">🖼️ Cloudinary Ayarları</h2>
          <p className="text-gray-400 text-sm mb-4">
            Sponsor ve market resimleri için gereklidir. <a href="https://cloudinary.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">cloudinary.com</a>'dan ücretsiz hesap oluşturabilirsiniz.
          </p>
          <div className="space-y-4">
            <div>
              <Label className="text-white text-base">Cloud Name</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={cloudinaryCloudName?.value || ''}
                  onChange={(e) => handleInputChange('cloudinary_cloud_name', e.target.value)}
                  className="bg-white/10 border-white/20 text-white flex-1"
                  placeholder="your-cloud-name"
                />
                <Button
                  onClick={() => saveSetting('cloudinary_cloud_name', cloudinaryCloudName?.value || '')}
                  disabled={saving}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-white text-base">API Key</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={cloudinaryApiKey?.value || ''}
                  onChange={(e) => handleInputChange('cloudinary_api_key', e.target.value)}
                  className="bg-white/10 border-white/20 text-white flex-1"
                  placeholder="123456789012345"
                />
                <Button
                  onClick={() => saveSetting('cloudinary_api_key', cloudinaryApiKey?.value || '')}
                  disabled={saving}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-white text-base">API Secret</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={cloudinaryApiSecret?.value || ''}
                  onChange={(e) => handleInputChange('cloudinary_api_secret', e.target.value)}
                  className="bg-white/10 border-white/20 text-white flex-1"
                  placeholder="your-api-secret"
                  type="password"
                />
                <Button
                  onClick={() => saveSetting('cloudinary_api_secret', cloudinaryApiSecret?.value || '')}
                  disabled={saving}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Önemli Notlar */}
        <Card className="bg-yellow-500/10 border-yellow-500/30 p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">⚠️</div>
            <div className="flex-1">
              <h3 className="text-yellow-300 font-semibold mb-1">Önemli Notlar</h3>
              <ul className="text-yellow-200 text-sm space-y-1">
                <li>• Telegram Bot Token'ı girip kaydettiğinizde bot otomatik olarak başlar ve webhook otomatik kurulur</li>
                <li>• Kanal eklerken tip olarak "Kanal" veya "Grup" seçin - bot sadece gruplarda mesaj dinler ve puan verir</li>
                <li>• Bakım modu aktifken kullanıcılar bota erişemez ve puan kazanamaz</li>
                <li>• Cloudinary ayarları Shop ve Sponsor resimlerini yüklemek için gereklidir</li>
                <li>• Ayarlar değiştirildikten sonra maksimum 1 dakika içinde aktif olur</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>

      {/* Kanal Ekle/Düzenle Dialog */}
      <Dialog open={channelDialogOpen} onOpenChange={setChannelDialogOpen}>
        <DialogContent className="bg-slate-900 border-white/20">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingChannel ? 'Kanalı Düzenle' : 'Yeni Kanal Ekle'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleChannelSubmit} className="space-y-4">
            <div>
              <Label htmlFor="channelId" className="text-white">Kanal ID / Username</Label>
              <Input
                id="channelId"
                value={channelFormData.channelId}
                onChange={(e) => setChannelFormData({ ...channelFormData, channelId: e.target.value })}
                className="bg-white/5 border-white/10 text-white mt-1"
                placeholder="@kanaladi veya -1001234567890"
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                Kanal username'i (@kanaladi) veya kanal ID'si (-1001234567890)
              </p>
            </div>

            <div>
              <Label htmlFor="channelName" className="text-white">Kanal Adı</Label>
              <Input
                id="channelName"
                value={channelFormData.channelName}
                onChange={(e) => setChannelFormData({ ...channelFormData, channelName: e.target.value })}
                className="bg-white/5 border-white/10 text-white mt-1"
                placeholder="Örnek Kanal"
                required
              />
            </div>

            <div>
              <Label htmlFor="channelLink" className="text-white">Kanal Linki</Label>
              <Input
                id="channelLink"
                value={channelFormData.channelLink}
                onChange={(e) => setChannelFormData({ ...channelFormData, channelLink: e.target.value })}
                className="bg-white/5 border-white/10 text-white mt-1"
                placeholder="https://t.me/kanaladi"
                required
              />
            </div>

            <div>
              <Label htmlFor="channelType" className="text-white">Kanal Tipi</Label>
              <Select
                value={channelFormData.channelType}
                onValueChange={(value) => setChannelFormData({ ...channelFormData, channelType: value })}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1">
                  <SelectValue placeholder="Tip seçin" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/20">
                  <SelectItem value="channel" className="text-white">Kanal</SelectItem>
                  <SelectItem value="group" className="text-white">Grup</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400 mt-1">
                Bot sadece "Grup" seçeneğinde mesaj dinler ve puan verir
              </p>
            </div>

            <div>
              <Label htmlFor="order" className="text-white">Sıralama</Label>
              <Input
                id="order"
                type="number"
                value={channelFormData.order}
                onChange={(e) => setChannelFormData({ ...channelFormData, order: parseInt(e.target.value) })}
                className="bg-white/5 border-white/10 text-white mt-1"
                min="0"
                required
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setChannelDialogOpen(false)}
                className="flex-1 border-white/20 hover:bg-white/10"
              >
                İptal
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {editingChannel ? 'Güncelle' : 'Ekle'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
