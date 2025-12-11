'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, MonitorPlay, GripVertical, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Switch } from '@/components/ui/switch'
import Image from 'next/image'

interface Setting {
  id: string
  key: string
  value: string
  description: string
  category: string
}

interface Sponsor {
  id: string
  name: string
  logoUrl?: string
  category: string
  isActive: boolean
  order: number
  showInBanner: boolean
}

export default function AdminAdsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<Setting[]>([])
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [draggedItem, setDraggedItem] = useState<number | null>(null)

  // Sponsor Banner
  const [sponsorBannerEnabled, setSponsorBannerEnabled] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin')
      return
    }
    loadSettings()
    loadSponsors()
  }, [])

  async function loadSettings() {
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch('/api/admin/settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
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

  async function loadSponsors() {
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch('/api/admin/sponsors', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      // Order'a göre sırala
      const sorted = (data.sponsors || []).sort((a: Sponsor, b: Sponsor) => a.order - b.order)
      setSponsors(sorted)
    } catch (error) {
      console.error('Error loading sponsors:', error)
      toast.error('Sponsorlar yüklenemedi')
    }
  }

  async function toggleSponsorBanner() {
    const newValue = !sponsorBannerEnabled

    // Optimistic update - önce UI'ı güncelle
    setSponsorBannerEnabled(newValue)

    setSaving(true)
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ key: 'sponsor_banner_enabled', value: newValue.toString() })
      })

      const data = await response.json()

      if (data.success) {
        toast.success(newValue ? 'Sponsor banner aktif edildi' : 'Sponsor banner kapatıldı')
        setSettings(prev =>
          prev.map(s => s.key === 'sponsor_banner_enabled' ? { ...s, value: newValue.toString() } : s)
        )
      } else {
        setSponsorBannerEnabled(!newValue)
        toast.error(data.error || 'Ayar kaydedilemedi')
      }
    } catch (error) {
      setSponsorBannerEnabled(!newValue)
      console.error('Save error:', error)
      toast.error('Bir hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  async function toggleSponsorInBanner(sponsorId: string, currentValue: boolean) {
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch(`/api/admin/sponsors/${sponsorId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ showInBanner: !currentValue })
      })

      const data = await response.json()

      if (data.sponsor) {
        setSponsors(prev => prev.map(s =>
          s.id === sponsorId ? { ...s, showInBanner: !currentValue } : s
        ))
        toast.success(!currentValue ? 'Sponsor banner\'a eklendi' : 'Sponsor banner\'dan çıkarıldı')
      } else {
        toast.error(data.error || 'İşlem başarısız')
      }
    } catch (error) {
      console.error('Toggle error:', error)
      toast.error('Bir hata oluştu')
    }
  }

  function handleDragStart(index: number) {
    setDraggedItem(index)
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    if (draggedItem === null || draggedItem === index) return

    const newSponsors = [...sponsors]
    const draggedSponsor = newSponsors[draggedItem]
    newSponsors.splice(draggedItem, 1)
    newSponsors.splice(index, 0, draggedSponsor)

    setSponsors(newSponsors)
    setDraggedItem(index)
  }

  async function handleDragEnd() {
    if (draggedItem === null) return

    try {
      // Yeni order değerlerini güncelle
      const updates = sponsors.map((sponsor, index) => ({
        id: sponsor.id,
        order: index
      }))

      const token = localStorage.getItem('admin_token')
      const response = await fetch('/api/admin/sponsors/reorder', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ sponsors: updates })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Sıralama kaydedildi')
      } else {
        toast.error('Sıralama kaydedilemedi')
        loadSponsors() // Geri yükle
      }
    } catch (error) {
      console.error('Reorder error:', error)
      toast.error('Bir hata oluştu')
      loadSponsors() // Geri yükle
    } finally {
      setDraggedItem(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  const bannerSponsors = sponsors.filter(s => s.showInBanner && s.isActive && s.logoUrl)

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
                Kayan Banner Yönetimi
              </h1>
              <p className="text-gray-400 mt-1">Sponsor banner gösterimini yönetin</p>
            </div>
          </div>
        </div>

        {/* Banner Açma/Kapama */}
        <Card className="bg-white/5 border-white/10 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Kayan Banner Durumu</h2>
              <p className="text-gray-400 text-sm">
                Banner açıkken seçili sponsorlar ana sayfada kayan şerit halinde görünür
              </p>
            </div>
            <Switch
              checked={sponsorBannerEnabled}
              onCheckedChange={toggleSponsorBanner}
              disabled={saving}
              className="ml-4 scale-125"
            />
          </div>

          {/* Banner Durumu */}
          <div className={`mt-4 p-4 rounded-lg border ${sponsorBannerEnabled ? 'bg-green-500/10 border-green-500/30' : 'bg-gray-500/10 border-gray-500/30'}`}>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${sponsorBannerEnabled ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
              <span className="text-white font-medium">
                {sponsorBannerEnabled ? `Banner Aktif - ${bannerSponsors.length} sponsor gösteriliyor` : 'Banner Kapalı'}
              </span>
            </div>
          </div>
        </Card>

        {/* Banner'da Gösterilecek Sponsorları Seç */}
        <Card className="bg-white/5 border-white/10 p-6">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-white mb-2">Banner'da Gösterilecek Sponsorlar</h2>
            <p className="text-gray-400 text-sm">
              Sponsorları sürükleyerek sıralayın. Sıralama banner'da soldan sağa kayma sırası olacaktır.
            </p>
          </div>

          {sponsors.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-3">Henüz sponsor eklenmemiş</p>
              <Link href="/admin/sponsors">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  Sponsor Ekle
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {sponsors.map((sponsor, index) => (
                <div
                  key={sponsor.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-4 p-4 rounded-lg border transition-all cursor-move ${
                    sponsor.showInBanner && sponsor.isActive && sponsor.logoUrl
                      ? 'bg-blue-500/10 border-blue-500/30'
                      : 'bg-white/5 border-white/10'
                  } ${draggedItem === index ? 'opacity-50' : ''} hover:border-blue-500/50`}
                >
                  {/* Drag Handle */}
                  <GripVertical className="w-5 h-5 text-gray-400" />

                  {/* Sıra Numarası */}
                  <div className="text-white font-bold text-lg bg-white/10 rounded-full w-8 h-8 flex items-center justify-center">
                    {index + 1}
                  </div>

                  {/* Logo */}
                  {sponsor.logoUrl && (
                    <div className={`w-16 h-12 rounded-lg overflow-hidden flex-shrink-0 ${
                      sponsor.category === 'vip'
                        ? 'border-2 border-yellow-500/60 bg-gradient-to-br from-yellow-900/30 to-amber-800/30'
                        : 'border border-white/10 bg-white/5'
                    }`}>
                      <Image
                        src={sponsor.logoUrl}
                        alt={sponsor.name}
                        width={64}
                        height={48}
                        className="object-contain w-full h-full p-1"
                        unoptimized
                      />
                    </div>
                  )}

                  {/* Sponsor Bilgisi */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-semibold">{sponsor.name}</h3>
                      {sponsor.category === 'vip' && (
                        <span className="bg-gradient-to-r from-yellow-400 to-amber-500 text-black text-xs font-bold px-2 py-0.5 rounded">
                          VIP
                        </span>
                      )}
                      {!sponsor.isActive && (
                        <span className="bg-red-500/20 text-red-400 text-xs font-bold px-2 py-0.5 rounded border border-red-500/30">
                          Pasif
                        </span>
                      )}
                      {!sponsor.logoUrl && (
                        <span className="bg-orange-500/20 text-orange-400 text-xs font-bold px-2 py-0.5 rounded border border-orange-500/30">
                          Logo Yok
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Banner'da Göster Toggle */}
                  <Button
                    size="sm"
                    variant={sponsor.showInBanner && sponsor.isActive && sponsor.logoUrl ? "default" : "outline"}
                    onClick={() => toggleSponsorInBanner(sponsor.id, sponsor.showInBanner)}
                    disabled={!sponsor.isActive || !sponsor.logoUrl}
                    className={sponsor.showInBanner && sponsor.isActive && sponsor.logoUrl
                      ? "bg-green-600 hover:bg-green-700"
                      : "border-white/20 hover:bg-white/10"
                    }
                  >
                    {sponsor.showInBanner && sponsor.isActive && sponsor.logoUrl ? (
                      <>
                        <Eye className="w-4 h-4 mr-2" />
                        Banner'da
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-4 h-4 mr-2" />
                        Gizli
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Yönlendirme */}
        <Card className="bg-blue-500/10 border-blue-500/30 p-4">
          <h4 className="text-blue-300 font-semibold mb-2">💡 Sponsor Yönetimi</h4>
          <p className="text-blue-200 text-sm mb-3">
            Sponsor eklemek, düzenlemek veya silmek için Sponsor Yönetimi sayfasına gidin
          </p>
          <Link href="/admin/sponsors">
            <Button className="bg-blue-600 hover:bg-blue-700">
              Sponsorları Yönet
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  )
}
