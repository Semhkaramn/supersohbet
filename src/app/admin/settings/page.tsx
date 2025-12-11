'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Settings, Save, ArrowLeft, Power, PowerOff, Bell } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Switch } from '@/components/ui/switch'

interface Setting {
  id: string
  key: string
  value: string
  description: string
  category: string
}

export default function AdminSettingsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<Setting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [maintenanceMode, setMaintenanceMode] = useState(false)

  // Bildirim ayarları
  const [notifyOrderApproved, setNotifyOrderApproved] = useState(false)
  const [notifyLevelUp, setNotifyLevelUp] = useState(false)

  // Roll sistemi
  const [rollEnabled, setRollEnabled] = useState(true)

  // Aktif grup için local state
  const [activeGroupInput, setActiveGroupInput] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin')
      return
    }
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      const response = await fetch('/api/admin/settings')
      const data = await response.json()
      setSettings(data.settings || [])

      // Bakım modunu ayarla
      const maintenanceSetting = data.settings.find((s: Setting) => s.key === 'maintenance_mode')
      setMaintenanceMode(maintenanceSetting?.value === 'true')

      // Bildirim ayarlarını yükle
      const orderApprovedNotify = data.settings.find((s: Setting) => s.key === 'notify_order_approved')
      setNotifyOrderApproved(orderApprovedNotify?.value === 'true')

      const levelUpNotify = data.settings.find((s: Setting) => s.key === 'notify_level_up')
      setNotifyLevelUp(levelUpNotify?.value === 'true')

      // Roll sistemi ayarını yükle
      const rollEnabledSetting = data.settings.find((s: Setting) => s.key === 'roll_enabled')
      setRollEnabled(rollEnabledSetting?.value === 'true')

      // Aktif grup ayarını yükle
      const activeGroupSetting = data.settings.find((s: Setting) => s.key === 'activity_group_id')
      setActiveGroupInput(activeGroupSetting?.value || '')

    } catch (error) {
      console.error('Error loading settings:', error)
      toast.error('Ayarlar yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  async function saveSetting(key: string, value: string, showToast = true) {
    setSaving(true)
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      })

      const data = await response.json()

      if (data.success) {
        if (showToast) {
          if (key === 'telegram_bot_token' && data.webhookSet) {
            toast.success(`Bot başarıyla bağlandı! @${data.botUsername}`)
          } else {
            toast.success('Ayar kaydedildi!')
          }
        }
        await loadSettings()
        return { success: true, data }
      } else {
        if (showToast) {
          toast.error(data.error || 'Ayar kaydedilemedi')
        }
        return { success: false, error: data.error }
      }
    } catch (error) {
      console.error('Save error:', error)
      if (showToast) {
        toast.error('Bir hata oluştu')
      }
      return { success: false, error: 'Bir hata oluştu' }
    } finally {
      setSaving(false)
    }
  }

  async function toggleMaintenanceMode() {
    const newValue = !maintenanceMode

    // Optimistic update - önce UI'ı güncelle
    setMaintenanceMode(newValue)

    setSaving(true)
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'maintenance_mode', value: newValue.toString() })
      })

      const data = await response.json()

      if (data.success) {
        toast.success(newValue ? 'Bakım modu aktif edildi' : 'Bakım modu kapatıldı')
        // Settings state'ini de güncelle - önemli!
        setSettings(prev =>
          prev.map(s => s.key === 'maintenance_mode' ? { ...s, value: newValue.toString() } : s)
        )
      } else {
        // Hata varsa geri al
        setMaintenanceMode(!newValue)
        toast.error(data.error || 'Ayar kaydedilemedi')
      }
    } catch (error) {
      // Hata varsa geri al
      setMaintenanceMode(!newValue)
      console.error('Save error:', error)
      toast.error('Bir hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  async function toggleNotificationSetting(key: string, currentValue: boolean, setterFunction: (value: boolean) => void) {
    const newValue = !currentValue

    // Optimistic update - önce UI'ı güncelle
    setterFunction(newValue)

    setSaving(true)
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: newValue.toString() })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Ayar güncellendi')
        // Settings state'ini de güncelle - önemli!
        setSettings(prev =>
          prev.map(s => s.key === key ? { ...s, value: newValue.toString() } : s)
        )
      } else {
        // Hata varsa geri al
        setterFunction(currentValue)
        toast.error(data.error || 'Ayar kaydedilemedi')
      }
    } catch (error) {
      // Hata varsa geri al
      setterFunction(currentValue)
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

  // Grup kaydetme fonksiyonları
  async function savePointsAndXpSettings() {
    setSaving(true)
    try {
      const settingsToSave = [
        { key: 'points_per_message', value: pointsPerMessage?.value || '' },
        { key: 'xp_per_message', value: xpPerMessage?.value || '' },
        { key: 'messages_for_xp', value: messagesForXp?.value || '' }
      ]

      // Tüm ayarları paralel olarak kaydet
      const promises = settingsToSave.map(setting =>
        fetch('/api/admin/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(setting)
        }).then(res => res.json())
      )

      const results = await Promise.all(promises)

      const allSuccess = results.every(r => r.success)

      if (allSuccess) {
        toast.success('Tüm ayarlar kaydedildi!')
        // Settings state'ini güncelle
        setSettings(prev =>
          prev.map(s => {
            const updatedSetting = settingsToSave.find(setting => setting.key === s.key)
            return updatedSetting ? { ...s, value: updatedSetting.value } : s
          })
        )
      } else {
        toast.error('Bazı ayarlar kaydedilemedi')
      }
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Bir hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  async function saveMessageRestrictionsSettings() {
    setSaving(true)
    try {
      const settingsToSave = [
        { key: 'min_message_length', value: minMessageLength?.value || '' },
        { key: 'message_cooldown_seconds', value: messageCooldown?.value || '' }
      ]

      const promises = settingsToSave.map(setting =>
        fetch('/api/admin/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(setting)
        }).then(res => res.json())
      )

      const results = await Promise.all(promises)

      const allSuccess = results.every(r => r.success)

      if (allSuccess) {
        toast.success('Tüm ayarlar kaydedildi!')
        setSettings(prev =>
          prev.map(s => {
            const updatedSetting = settingsToSave.find(setting => setting.key === s.key)
            return updatedSetting ? { ...s, value: updatedSetting.value } : s
          })
        )
      } else {
        toast.error('Bazı ayarlar kaydedilemedi')
      }
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Bir hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  async function saveWheelSettings() {
    setSaving(true)
    try {
      const settingsToSave = [
        { key: 'daily_wheel_spins', value: dailyWheelSpins?.value || '' },
        { key: 'wheel_reset_time', value: wheelResetTime?.value || '00:00' }
      ]

      const promises = settingsToSave.map(setting =>
        fetch('/api/admin/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(setting)
        }).then(res => res.json())
      )

      const results = await Promise.all(promises)

      const allSuccess = results.every(r => r.success)

      if (allSuccess) {
        toast.success('Tüm ayarlar kaydedildi!')
        setSettings(prev =>
          prev.map(s => {
            const updatedSetting = settingsToSave.find(setting => setting.key === s.key)
            return updatedSetting ? { ...s, value: updatedSetting.value } : s
          })
        )
      } else {
        toast.error('Bazı ayarlar kaydedilemedi')
      }
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Bir hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  async function saveCloudinarySettings() {
    setSaving(true)
    try {
      const settingsToSave = [
        { key: 'cloudinary_cloud_name', value: cloudinaryCloudName?.value || '' },
        { key: 'cloudinary_api_key', value: cloudinaryApiKey?.value || '' },
        { key: 'cloudinary_api_secret', value: cloudinaryApiSecret?.value || '' }
      ]

      const promises = settingsToSave.map(setting =>
        fetch('/api/admin/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(setting)
        }).then(res => res.json())
      )

      const results = await Promise.all(promises)

      const allSuccess = results.every(r => r.success)

      if (allSuccess) {
        toast.success('Tüm ayarlar kaydedildi!')
        setSettings(prev =>
          prev.map(s => {
            const updatedSetting = settingsToSave.find(setting => setting.key === s.key)
            return updatedSetting ? { ...s, value: updatedSetting.value } : s
          })
        )
      } else {
        toast.error('Bazı ayarlar kaydedilemedi')
      }
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Bir hata oluştu')
    } finally {
      setSaving(false)
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
  const dailyWheelSpins = getSetting('daily_wheel_spins')
  const wheelResetTime = getSetting('wheel_reset_time')
  const cloudinaryCloudName = getSetting('cloudinary_cloud_name')
  const cloudinaryApiKey = getSetting('cloudinary_api_key')
  const cloudinaryApiSecret = getSetting('cloudinary_api_secret')
  const activityGroupId = getSetting('activity_group_id')

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

        {/* Bildirim Ayarları - YENİ */}
        <Card className="bg-white/5 border-white/10 p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Bell className="w-6 h-6" />
            Bildirim Ayarları
          </h2>
          <p className="text-gray-400 text-sm mb-4">
            Bota start yapmış kullanıcılara gönderilecek otomatik bildirimler
          </p>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex-1">
                <h3 className="text-white font-medium">Sipariş Onay Bildirimi</h3>
                <p className="text-gray-400 text-sm mt-1">
                  Market siparişleri onaylandığında kullanıcılara özelden mesaj gönderilsin
                </p>
              </div>
              <Switch
                checked={notifyOrderApproved}
                onCheckedChange={() => toggleNotificationSetting('notify_order_approved', notifyOrderApproved, setNotifyOrderApproved)}
                disabled={saving}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex-1">
                <h3 className="text-white font-medium">Seviye Atlama Bildirimi</h3>
                <p className="text-gray-400 text-sm mt-1">
                  Kullanıcı seviye atladığında grupta bildirim mesajı gönderilsin
                </p>
              </div>
              <Switch
                checked={notifyLevelUp}
                onCheckedChange={() => toggleNotificationSetting('notify_level_up', notifyLevelUp, setNotifyLevelUp)}
                disabled={saving}
              />
            </div>
          </div>
        </Card>

        {/* Roll Sistemi Ayarları */}
        <Card className="bg-white/5 border-white/10 p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            🎲 Roll Sistemi
          </h2>
          <p className="text-gray-400 text-sm mb-4">
            Telegram grubunda roll sistemi komutlarını aktif/deaktif edin
          </p>
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
            <div className="flex-1">
              <h3 className="text-white font-medium">Roll Sistemini Aktifleştir</h3>
              <p className="text-gray-400 text-sm mt-1">
                Roll komutları (/başlat, /kaydet, /durum vs.) kullanılabilsin
              </p>
            </div>
            <Switch
              checked={rollEnabled}
              onCheckedChange={() => toggleNotificationSetting('roll_enabled', rollEnabled, setRollEnabled)}
              disabled={saving}
            />
          </div>
        </Card>

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

        {/* Aktif Grup Seçimi */}
        <Card className="bg-white/5 border-white/10 p-6">
          <h2 className="text-xl font-bold text-white mb-4">💬 Aktif Grup</h2>
          <div>
            <Label htmlFor="active_group" className="text-white text-base">Botun mesaj dinleyeceği grup</Label>
            <p className="text-xs text-gray-400 mb-2">Grup kullanıcı adı (@grupadi) veya Chat ID (-100123456789) giriniz</p>
            <div className="flex gap-2">
              <Input
                id="active_group"
                value={activeGroupInput}
                onChange={(e) => setActiveGroupInput(e.target.value)}
                className="bg-white/10 border-white/20 text-white flex-1"
                placeholder="@grupadi veya -100123456789"
              />
              <Button
                onClick={async () => {
                  const value = activeGroupInput.trim()
                  if (!value) {
                    toast.error('Grup bilgisi giriniz')
                    return
                  }

                  try {
                    // Eğer @ ile başlıyorsa username, aksi halde direkt ID
                    const isUsername = value.startsWith('@')

                    if (isUsername) {
                      // Telegram API'den gerçek chat ID'yi al
                      setSaving(true)
                      const response = await fetch('/api/admin/settings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ chatUsername: value })
                      })
                      setSaving(false)

                      const data = await response.json()

                      if (data.success && data.chatId) {
                        // Gerçek chat ID'yi kaydet - showToast=false çünkü özel mesaj göstereceğiz
                        const result = await saveSetting('activity_group_id', data.chatId, false)
                        if (result.success) {
                          toast.success(`Aktif grup ayarlandı: ${data.chatTitle} (ID: ${data.chatId})`)
                          // Local state'i güncelle
                          setActiveGroupInput(data.chatId)
                        } else {
                          toast.error(result.error || 'Ayar kaydedilemedi')
                        }
                      } else {
                        toast.error(data.error || 'Grup ID\'si alınamadı')
                      }
                    } else {
                      // Zaten sayısal ID, direkt kaydet - showToast=false çünkü özel mesaj göstereceğiz
                      const result = await saveSetting('activity_group_id', value, false)
                      if (result.success) {
                        toast.success(`Aktif grup ayarlandı (ID: ${value})`)
                        // Local state'i güncelle
                        setActiveGroupInput(value)
                      } else {
                        toast.error(result.error || 'Ayar kaydedilemedi')
                      }
                    }
                  } catch (error) {
                    console.error('Error saving active group:', error)
                    toast.error('Bir hata oluştu')
                    setSaving(false)
                  }
                }}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="w-4 h-4 mr-1" />
                Kaydet
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Bot sadece bu grupta mesaj dinler ve puan verir. @ ile username girerseniz otomatik ID'ye çevrilir.
            </p>
            {activeGroupInput && (
              <p className="text-xs text-green-400 mt-2">
                ✅ Aktif grup ID: {activeGroupInput}
              </p>
            )}
          </div>
        </Card>

        {/* Puan ve XP Ayarları */}
        <Card className="bg-white/5 border-white/10 p-6">
          <h2 className="text-xl font-bold text-white mb-4">⭐ Puan ve XP Ayarları</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-white text-base">Mesaj Başına Puan</Label>
                <Input
                  value={pointsPerMessage?.value || ''}
                  onChange={(e) => handleInputChange('points_per_message', e.target.value)}
                  className="bg-white/10 border-white/20 text-white mt-2"
                  type="number"
                />
              </div>

              <div>
                <Label className="text-white text-base">Mesaj Başına XP</Label>
                <Input
                  value={xpPerMessage?.value || ''}
                  onChange={(e) => handleInputChange('xp_per_message', e.target.value)}
                  className="bg-white/10 border-white/20 text-white mt-2"
                  type="number"
                />
              </div>

              <div>
                <Label className="text-white text-base">XP için Mesaj Sayısı</Label>
                <Input
                  value={messagesForXp?.value || ''}
                  onChange={(e) => handleInputChange('messages_for_xp', e.target.value)}
                  className="bg-white/10 border-white/20 text-white mt-2"
                  type="number"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={savePointsAndXpSettings}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="w-4 h-4 mr-2" />
                Tüm Ayarları Kaydet
              </Button>
            </div>
          </div>
        </Card>

        {/* Mesaj Kısıtlamaları */}
        <Card className="bg-white/5 border-white/10 p-6">
          <h2 className="text-xl font-bold text-white mb-4">🚫 Mesaj Kısıtlamaları</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-white text-base">Min. Mesaj Uzunluğu</Label>
                <Input
                  value={minMessageLength?.value || ''}
                  onChange={(e) => handleInputChange('min_message_length', e.target.value)}
                  className="bg-white/10 border-white/20 text-white mt-2"
                  type="number"
                />
              </div>

              <div>
                <Label className="text-white text-base">Mesaj Cooldown (saniye)</Label>
                <Input
                  value={messageCooldown?.value || ''}
                  onChange={(e) => handleInputChange('message_cooldown_seconds', e.target.value)}
                  className="bg-white/10 border-white/20 text-white mt-2"
                  type="number"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={saveMessageRestrictionsSettings}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="w-4 h-4 mr-2" />
                Tüm Ayarları Kaydet
              </Button>
            </div>
          </div>
        </Card>

        {/* Çark Ayarları */}
        <Card className="bg-white/5 border-white/10 p-6">
          <h2 className="text-xl font-bold text-white mb-4">🎡 Şans Çarkı Ayarları</h2>
          <div className="space-y-4">
            <div>
              <Label className="text-white text-base">Günlük Ücretsiz Çark Hakkı</Label>
              <Input
                value={dailyWheelSpins?.value || ''}
                onChange={(e) => handleInputChange('daily_wheel_spins', e.target.value)}
                className="bg-white/10 border-white/20 text-white mt-2"
                type="number"
              />
              <p className="text-xs text-gray-400 mt-2">
                Şans çarkı tamamen ücretsizdir, sadece günlük çevirme hakkı sınırlaması vardır.
              </p>
            </div>

            <div>
              <Label className="text-white text-base">Günlük Sıfırlama Zamanı</Label>
              <p className="text-xs text-gray-400 mt-1 mb-2">
                Çark haklarının her gün sıfırlanacağı saat (HH:mm formatında)
              </p>
              <Input
                value={wheelResetTime?.value || '00:00'}
                onChange={(e) => handleInputChange('wheel_reset_time', e.target.value)}
                className="bg-white/10 border-white/20 text-white"
                type="time"
                placeholder="19:30"
              />
              <p className="text-xs text-gray-400 mt-2">
                Örnek: 00:00 → Gece Yarısı | 12:30 → Öğlen 12:30 | 19:30 → Akşam 19:30
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={saveWheelSettings}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="w-4 h-4 mr-2" />
                Tüm Ayarları Kaydet
              </Button>
            </div>
          </div>
        </Card>

        {/* Cloudinary Ayarları */}
        <Card className="bg-white/5 border-white/10 p-6">
          <h2 className="text-xl font-bold text-white mb-4">🖼️ Cloudinary Ayarları</h2>
          <div className="space-y-4">
            <div>
              <Label className="text-white text-base">Cloud Name</Label>
              <Input
                value={cloudinaryCloudName?.value || ''}
                onChange={(e) => handleInputChange('cloudinary_cloud_name', e.target.value)}
                className="bg-white/10 border-white/20 text-white mt-2"
                placeholder="your-cloud-name"
              />
            </div>

            <div>
              <Label className="text-white text-base">API Key</Label>
              <Input
                value={cloudinaryApiKey?.value || ''}
                onChange={(e) => handleInputChange('cloudinary_api_key', e.target.value)}
                className="bg-white/10 border-white/20 text-white mt-2"
                placeholder="123456789012345"
              />
            </div>

            <div>
              <Label className="text-white text-base">API Secret</Label>
              <Input
                value={cloudinaryApiSecret?.value || ''}
                onChange={(e) => handleInputChange('cloudinary_api_secret', e.target.value)}
                className="bg-white/10 border-white/20 text-white mt-2"
                placeholder="your-api-secret"
                type="password"
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={saveCloudinarySettings}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="w-4 h-4 mr-2" />
                Tüm Ayarları Kaydet
              </Button>
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
                <li>• Ayarları değiştirdikten sonra mutlaka kaydet butonuna basın</li>
                <li>• Yanlış yapılan ayarlar botun çalışmasını engelleyebilir</li>
                <li>• Önemli değişiklikler yapmadan önce mevcut ayarları not alın</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
