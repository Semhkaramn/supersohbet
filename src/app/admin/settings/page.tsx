'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Settings, Save, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

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
    } catch (error) {
      console.error('Error loading settings:', error)
      toast.error('Ayarlar yüklenemedi')
    } finally {
      setLoading(false)
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
        // Bot token için özel mesaj
        if (key === 'telegram_bot_token' && data.webhookSet) {
          toast.success(data.message || `Bot başarıyla bağlandı! @${data.botUsername}`, {
            duration: 5000
          })
        } else if (key === 'telegram_bot_token' && data.webhookSet === false) {
          toast.warning(data.message || 'Ayar kaydedildi ama webhook kurulamadı', {
            duration: 5000
          })
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

  function handleInputChange(key: string, value: string) {
    setSettings(prev =>
      prev.map(s => s.key === key ? { ...s, value } : s)
    )
  }

  function getSettingsByCategory(category: string) {
    return settings.filter(s => s.category === category)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  const categories = [
    { key: 'general', label: 'Genel', icon: '⚙️' },
    { key: 'telegram', label: 'Telegram', icon: '📱' },
    { key: 'points', label: 'Puan & XP', icon: '⭐' },
    { key: 'referral', label: 'Referans', icon: '👥' },
    { key: 'limits', label: 'Kısıtlamalar', icon: '🚫' },
    { key: 'wheel', label: 'Şans Çarkı', icon: '🎡' },
  ]

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="w-8 h-8 text-blue-400" />
            <h1 className="text-3xl font-bold text-white">Sistem Ayarları</h1>
          </div>
          <p className="text-gray-400">Bot davranışlarını ve sistem parametrelerini yönetin</p>
          <Button
            onClick={() => router.push('/admin/dashboard')}
            variant="outline"
            className="mt-4"
          >
            ← Admin Paneline Dön
          </Button>
        </div>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-6 bg-white/10">
            {categories.map(cat => (
              <TabsTrigger key={cat.key} value={cat.key} className="text-white">
                {cat.icon} {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map(cat => (
            <TabsContent key={cat.key} value={cat.key}>
              <Card className="bg-white/5 border-white/10 p-6">
                <div className="space-y-6">
                  {getSettingsByCategory(cat.key).map(setting => (
                    <div key={setting.key} className="space-y-2">
                      <Label htmlFor={setting.key} className="text-white text-base">
                        {setting.description}
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id={setting.key}
                          value={setting.value}
                          onChange={(e) => handleInputChange(setting.key, e.target.value)}
                          className="bg-white/10 border-white/20 text-white flex-1"
                          placeholder={setting.description}
                        />
                        <Button
                          onClick={() => saveSetting(setting.key, setting.value)}
                          disabled={saving}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Save className="w-4 h-4 mr-1" />
                          Kaydet
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500">Anahtar: {setting.key}</p>
                    </div>
                  ))}

                  {getSettingsByCategory(cat.key).length === 0 && (
                    <p className="text-gray-400 text-center py-8">Bu kategoride ayar bulunmuyor</p>
                  )}
                </div>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        <Card className="bg-yellow-500/10 border-yellow-500/30 p-4 mt-6">
          <div className="flex items-start gap-3">
            <div className="text-2xl">⚠️</div>
            <div className="flex-1">
              <h3 className="text-yellow-300 font-semibold mb-1">Önemli Notlar</h3>
              <ul className="text-yellow-200 text-sm space-y-1">
                <li>• Telegram Bot Token'ı girip kaydettiğinizde bot otomatik olarak başlar</li>
                <li>• Webhook otomatik olarak kurulur, manuel ayar gerekmez</li>
                <li>• Ayarlar değiştirildikten sonra maksimum 1 dakika içinde aktif olur</li>
                <li>• Bakım modu aktifken kullanıcılar puan kazanamaz</li>
                <li>• messages_for_xp = 1 her mesajda, 2 her 2 mesajda bir XP verir</li>
                <li className="text-blue-200 font-semibold mt-2">📤 Upload URL: Hostinger'deki upload.php dosyanızın tam URL'sini girin (örn: https://siteniz.com/uploads/upload.php)</li>
                <li className="text-blue-200">• Boş bırakılırsa resimler yerel sunucuya yüklenir</li>
                <li className="text-blue-200">• Upload URL girildiğinde tüm resimler otomatik olarak o sunucuya yüklenecektir</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
