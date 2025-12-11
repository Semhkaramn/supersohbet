'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, MonitorPlay } from 'lucide-react'
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

export default function AdminAdsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<Setting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Sponsor Banner
  const [sponsorBannerEnabled, setSponsorBannerEnabled] = useState(false)

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

      // Sponsor Banner ayarını yükle
      const sponsorBannerSetting = data.settings.find((s: Setting) => s.key === 'sponsor_banner_enabled')
      setSponsorBannerEnabled(sponsorBannerSetting?.value === 'true')

    } catch (error) {
      console.error('Error loading settings:', error)
      toast.error('Ayarlar yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  async function toggleSponsorBanner() {
    const newValue = !sponsorBannerEnabled

    // Optimistic update - önce UI'ı güncelle
    setSponsorBannerEnabled(newValue)

    setSaving(true)
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'sponsor_banner_enabled', value: newValue.toString() })
      })

      const data = await response.json()

      if (data.success) {
        toast.success(newValue ? 'Sponsor banner\'ı aktif edildi' : 'Sponsor banner\'ı kapatıldı')
        // Settings state'ini de güncelle
        setSettings(prev =>
          prev.map(s => s.key === 'sponsor_banner_enabled' ? { ...s, value: newValue.toString() } : s)
        )
      } else {
        // Hata varsa geri al
        setSponsorBannerEnabled(!newValue)
        toast.error(data.error || 'Ayar kaydedilemedi')
      }
    } catch (error) {
      // Hata varsa geri al
      setSponsorBannerEnabled(!newValue)
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
                <MonitorPlay className="w-8 h-8" />
                Reklam Ayarları
              </h1>
              <p className="text-gray-400 mt-1">Sponsor banner ve reklam gösterimlerini yönetin</p>
            </div>
          </div>
        </div>

        {/* Sponsor Banner Ayarları */}
        <Card className="bg-white/5 border-white/10 p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            🎯 Sponsor Banner Gösterimi
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            Ana sayfada header ile arama çubuğu arasında sponsor logolarının gösterildiği kayan şeridi kontrol edin
          </p>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-5 bg-white/5 rounded-lg border border-white/10 hover:border-blue-500/30 transition-colors">
              <div className="flex-1">
                <h3 className="text-white font-medium text-lg">Sponsor Banner</h3>
                <p className="text-gray-400 text-sm mt-1">
                  Kayıtlı sponsorların logolarının ana sayfada kayan şerit halinde gösterilmesi
                </p>
                <p className="text-gray-500 text-xs mt-2">
                  • Banner kapalıyken hiçbir sponsor logosu gösterilmez<br />
                  • Sadece aktif ve logosu olan sponsorlar gösterilir<br />
                  • VIP sponsorlar öncelikli olarak gösterilir
                </p>
              </div>
              <Switch
                checked={sponsorBannerEnabled}
                onCheckedChange={toggleSponsorBanner}
                disabled={saving}
                className="ml-4"
              />
            </div>

            {/* Banner Durumu */}
            <div className={`p-4 rounded-lg border ${sponsorBannerEnabled ? 'bg-green-500/10 border-green-500/30' : 'bg-gray-500/10 border-gray-500/30'}`}>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${sponsorBannerEnabled ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
                <span className="text-white font-medium">
                  {sponsorBannerEnabled ? 'Banner Aktif - Kullanıcılar görebilir' : 'Banner Kapalı - Kullanıcılara gösterilmiyor'}
                </span>
              </div>
            </div>

            {/* Yönlendirme */}
            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <h4 className="text-blue-300 font-semibold mb-2">💡 Sponsor Yönetimi</h4>
              <p className="text-blue-200 text-sm mb-3">
                Sponsorları eklemek, düzenlemek veya silmek için Sponsor Yönetimi sayfasına gidin
              </p>
              <Link href="/admin/sponsors">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  Sponsorları Yönet
                </Button>
              </Link>
            </div>
          </div>
        </Card>

        {/* Bilgilendirme */}
        <Card className="bg-yellow-500/10 border-yellow-500/30 p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">💡</div>
            <div className="flex-1">
              <h3 className="text-yellow-300 font-semibold mb-1">Sponsor Banner Nasıl Çalışır?</h3>
              <ul className="text-yellow-200 text-sm space-y-1">
                <li>• Ana sayfada header ile arama arasında yatay kayan bir şerit gösterilir</li>
                <li>• Sadece aktif ve logosu olan sponsorlar bu şeritte görünür</li>
                <li>• VIP kategorisindeki sponsorlar öncelikli sırayla gösterilir</li>
                <li>• Kullanıcılar logolara tıklayarak sponsor sitelerine yönlendirilir</li>
                <li>• Her tıklama istatistiklere kaydedilir</li>
                <li>• Banner kapalıyken şerit hiç gösterilmez ve sayfa düzeni normal şekilde görünür</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
