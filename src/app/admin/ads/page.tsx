'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, MonitorPlay, GripVertical, Eye, EyeOff, Share2, Plus, Edit2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

interface SocialMedia {
  id: string
  name: string
  platform: string
  username: string
  isActive: boolean
  order: number
}

const SOCIAL_PLATFORMS = [
  { value: 'telegram', label: 'Telegram', icon: '📱' },
  { value: 'instagram', label: 'Instagram', icon: '📷' },
  { value: 'twitter', label: 'Twitter/X', icon: '🐦' },
  { value: 'youtube', label: 'YouTube', icon: '📺' },
  { value: 'discord', label: 'Discord', icon: '💬' },
  { value: 'tiktok', label: 'TikTok', icon: '🎵' },
  { value: 'facebook', label: 'Facebook', icon: '👥' },
  { value: 'whatsapp', label: 'WhatsApp', icon: '💚' },
  { value: 'linkedin', label: 'LinkedIn', icon: '💼' },
  { value: 'twitch', label: 'Twitch', icon: '🎮' }
]

export default function AdminAdsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<Setting[]>([])
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [socialMedia, setSocialMedia] = useState<SocialMedia[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [draggedItem, setDraggedItem] = useState<number | null>(null)
  const [draggedSocial, setDraggedSocial] = useState<number | null>(null)

  // Sponsor Banner
  const [sponsorBannerEnabled, setSponsorBannerEnabled] = useState(false)

  // Social Media Dialog
  const [socialDialog, setSocialDialog] = useState(false)
  const [editingSocial, setEditingSocial] = useState<SocialMedia | null>(null)
  const [socialForm, setSocialForm] = useState({
    name: '',
    platform: '',
    username: ''
  })

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin')
      return
    }
    loadSettings()
    loadSponsors()
    loadSocialMedia()
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

  async function loadSocialMedia() {
    try {
      const response = await fetch('/api/admin/social-media')
      const data = await response.json()
      // Array olduğundan emin ol
      setSocialMedia(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error loading social media:', error)
      toast.error('Sosyal medya bağlantıları yüklenemedi')
    }
  }

  async function saveSocialMedia() {
    if (!socialForm.name || !socialForm.platform || !socialForm.username) {
      toast.error('Tüm alanları doldurun')
      return
    }

    setSaving(true)
    try {
      const url = editingSocial
        ? `/api/admin/social-media/${editingSocial.id}`
        : '/api/admin/social-media'

      const response = await fetch(url, {
        method: editingSocial ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...socialForm,
          isActive: true,
          order: editingSocial?.order ?? socialMedia.length
        })
      })

      const data = await response.json()

      if (data.id) {
        toast.success(editingSocial ? 'Sosyal medya güncellendi' : 'Sosyal medya eklendi')
        loadSocialMedia()
        setSocialDialog(false)
        setEditingSocial(null)
        setSocialForm({ name: '', platform: '', username: '' })
      } else {
        toast.error(data.error || 'İşlem başarısız')
      }
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Bir hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  async function deleteSocialMedia(id: string) {
    if (!confirm('Bu sosyal medya bağlantısını silmek istediğinize emin misiniz?')) return

    try {
      const response = await fetch(`/api/admin/social-media/${id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Sosyal medya silindi')
        loadSocialMedia()
      } else {
        toast.error(data.error || 'Silme başarısız')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Bir hata oluştu')
    }
  }

  async function toggleSocialActive(id: string, currentValue: boolean) {
    try {
      const item = socialMedia.find(s => s.id === id)
      if (!item) return

      const response = await fetch(`/api/admin/social-media/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...item,
          isActive: !currentValue
        })
      })

      const data = await response.json()

      if (data.id) {
        setSocialMedia(prev => prev.map(s =>
          s.id === id ? { ...s, isActive: !currentValue } : s
        ))
        toast.success(!currentValue ? 'Sosyal medya aktif edildi' : 'Sosyal medya pasif edildi')
      } else {
        toast.error(data.error || 'İşlem başarısız')
      }
    } catch (error) {
      console.error('Toggle error:', error)
      toast.error('Bir hata oluştu')
    }
  }

  function handleSocialDragStart(index: number) {
    setDraggedSocial(index)
  }

  function handleSocialDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    if (draggedSocial === null || draggedSocial === index) return

    const newItems = [...socialMedia]
    const draggedItem = newItems[draggedSocial]
    newItems.splice(draggedSocial, 1)
    newItems.splice(index, 0, draggedItem)

    setSocialMedia(newItems)
    setDraggedSocial(index)
  }

  async function handleSocialDragEnd() {
    if (draggedSocial === null) return

    try {
      const updates = socialMedia.map((item, index) => ({
        id: item.id,
        order: index
      }))

      const response = await fetch('/api/admin/social-media/reorder', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ items: updates })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Sıralama kaydedildi')
      } else {
        toast.error('Sıralama kaydedilemedi')
        loadSocialMedia()
      }
    } catch (error) {
      console.error('Reorder error:', error)
      toast.error('Bir hata oluştu')
      loadSocialMedia()
    } finally {
      setDraggedSocial(null)
    }
  }

  function openEditSocial(item: SocialMedia) {
    setEditingSocial(item)
    setSocialForm({
      name: item.name,
      platform: item.platform,
      username: item.username
    })
    setSocialDialog(true)
  }

  function openAddSocial() {
    setEditingSocial(null)
    setSocialForm({ name: '', platform: '', username: '' })
    setSocialDialog(true)
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
                Reklam Alanı Yönetimi
              </h1>
              <p className="text-gray-400 mt-1">Sponsor banner ve sosyal medya bağlantılarını yönetin</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="banner" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white/5">
            <TabsTrigger value="banner">Kayan Banner</TabsTrigger>
            <TabsTrigger value="social">
              <Share2 className="w-4 h-4 mr-2" />
              Sosyal Medya
            </TabsTrigger>
          </TabsList>

          <TabsContent value="banner" className="space-y-6 mt-6">

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

        {/* Social Media */}
        <Card className="bg-white/5 border-white/10 p-6">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-white mb-2">Sosyal Medya Bağlantıları</h2>
            <p className="text-gray-400 text-sm">
              Sosyal medya bağlantılarınızı yönetin. Sıralama banner'da soldan sağa kayma sırası olacaktır.
            </p>
          </div>

          {socialMedia.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-3">Henüz sosyal medya bağlantısı eklenmemiş</p>
              <Button onClick={openAddSocial} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Sosyal Medya Ekle
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {socialMedia.map((item, index) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => handleSocialDragStart(index)}
                  onDragOver={(e) => handleSocialDragOver(e, index)}
                  onDragEnd={handleSocialDragEnd}
                  className={`flex items-center gap-4 p-4 rounded-lg border transition-all cursor-move ${
                    item.isActive
                      ? 'bg-blue-500/10 border-blue-500/30'
                      : 'bg-white/5 border-white/10'
                  } ${draggedSocial === index ? 'opacity-50' : ''} hover:border-blue-500/50`}
                >
                  {/* Drag Handle */}
                  <GripVertical className="w-5 h-5 text-gray-400" />

                  {/* Sıra Numarası */}
                  <div className="text-white font-bold text-lg bg-white/10 rounded-full w-8 h-8 flex items-center justify-center">
                    {index + 1}
                  </div>

                  {/* Platform Icon */}
                  <div className="text-2xl">{SOCIAL_PLATFORMS.find(p => p.value === item.platform)?.icon}</div>

                  {/* Platform */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-semibold">{item.name}</h3>
                      <span className="text-gray-400 text-xs">{item.platform}</span>
                    </div>
                    <p className="text-gray-400 text-xs">{item.username}</p>
                  </div>

                  {/* Active Toggle */}
                  <Button
                    size="sm"
                    variant={item.isActive ? "default" : "outline"}
                    onClick={() => toggleSocialActive(item.id, item.isActive)}
                    disabled={saving}
                    className={item.isActive
                      ? "bg-green-600 hover:bg-green-700"
                      : "border-white/20 hover:bg-white/10"
                    }
                  >
                    {item.isActive ? (
                      <>
                        <Eye className="w-4 h-4 mr-2" />
                        Aktif
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-4 h-4 mr-2" />
                        Pasif
                      </>
                    )}
                  </Button>

                  {/* Edit/Delete Buttons */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditSocial(item)}
                      disabled={saving}
                      className="border-white/20 hover:bg-white/10"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteSocialMedia(item.id)}
                      disabled={saving}
                      className="border-red-500/30 hover:bg-red-500/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Social Media Dialog */}
        <Dialog open={socialDialog} onOpenChange={setSocialDialog}>
          <DialogContent className="bg-white/5 border-white/10">
            <DialogHeader>
              <DialogTitle>
                {editingSocial ? 'Sosyal Medya Güncelle' : 'Yeni Sosyal Medya Ekle'}
              </DialogTitle>
              <DialogDescription>
                {editingSocial ? 'Mevcut sosyal medya bilgilerini güncelleyin' : 'Yeni sosyal medya bağlantısı ekleyin'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Ad</Label>
                <Input
                  id="name"
                  value={socialForm.name}
                  onChange={(e) => setSocialForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Sosyal medya adı"
                  className="w-full"
                />
              </div>

              <div>
                <Label htmlFor="platform">Platform</Label>
                <Select
                  value={socialForm.platform}
                  onValueChange={(value) => setSocialForm(prev => ({ ...prev, platform: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Platform seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {SOCIAL_PLATFORMS.map(platform => (
                      <SelectItem key={platform.value} value={platform.value}>
                        {platform.icon} {platform.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="username">Kullanıcı Adı</Label>
                <Input
                  id="username"
                  value={socialForm.username}
                  onChange={(e) => setSocialForm(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="Kullanıcı adı"
                  className="w-full"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setSocialDialog(false)
                  setEditingSocial(null)
                  setSocialForm({ name: '', platform: '', username: '' })
                }}
                disabled={saving}
              >
                İptal
              </Button>
              <Button
                onClick={saveSocialMedia}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saving ? 'Kaydediliyor...' : editingSocial ? 'Güncelle' : 'Ekle'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
          </TabsContent>

          <TabsContent value="social" className="space-y-6 mt-6">
        {/* Social Media */}
        <div className="flex justify-end mb-4">
          <Button onClick={openAddSocial} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Sosyal Medya Ekle
          </Button>
        </div>

        <Card className="bg-white/5 border-white/10 p-6">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-white mb-2">Sosyal Medya Bağlantıları</h2>
            <p className="text-gray-400 text-sm">
              Sosyal medya bağlantılarınızı yönetin. Aktif olanlar sidebar'ın en altında görünecektir.
            </p>
          </div>

          {socialMedia.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-3">Henüz sosyal medya bağlantısı eklenmemiş</p>
              <Button onClick={openAddSocial} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Sosyal Medya Ekle
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {socialMedia.map((item, index) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => handleSocialDragStart(index)}
                  onDragOver={(e) => handleSocialDragOver(e, index)}
                  onDragEnd={handleSocialDragEnd}
                  className={`flex items-center gap-4 p-4 rounded-lg border transition-all cursor-move ${
                    item.isActive
                      ? 'bg-blue-500/10 border-blue-500/30'
                      : 'bg-white/5 border-white/10'
                  } ${draggedSocial === index ? 'opacity-50' : ''} hover:border-blue-500/50`}
                >
                  {/* Drag Handle */}
                  <GripVertical className="w-5 h-5 text-gray-400" />

                  {/* Sıra Numarası */}
                  <div className="text-white font-bold text-lg bg-white/10 rounded-full w-8 h-8 flex items-center justify-center">
                    {index + 1}
                  </div>

                  {/* Platform Icon */}
                  <div className="text-2xl">{SOCIAL_PLATFORMS.find(p => p.value === item.platform)?.icon}</div>

                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-semibold">{item.name}</h3>
                      <span className="text-gray-400 text-xs bg-white/10 px-2 py-0.5 rounded">
                        {SOCIAL_PLATFORMS.find(p => p.value === item.platform)?.label}
                      </span>
                      {!item.isActive && (
                        <span className="bg-red-500/20 text-red-400 text-xs font-bold px-2 py-0.5 rounded border border-red-500/30">
                          Pasif
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm mt-1">{item.username}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={item.isActive ? "default" : "outline"}
                      onClick={() => toggleSocialActive(item.id, item.isActive)}
                      className={item.isActive
                        ? "bg-green-600 hover:bg-green-700"
                        : "border-white/20 hover:bg-white/10"
                      }
                    >
                      {item.isActive ? (
                        <>
                          <Eye className="w-4 h-4 mr-2" />
                          Aktif
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-4 h-4 mr-2" />
                          Pasif
                        </>
                      )}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditSocial(item)}
                      className="border-white/20 hover:bg-white/10"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteSocialMedia(item.id)}
                      className="border-red-500/30 hover:bg-red-500/20 text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
          </TabsContent>
        </Tabs>

        {/* Social Media Dialog */}
        <Dialog open={socialDialog} onOpenChange={setSocialDialog}>
          <DialogContent className="bg-gray-900 border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white">
                {editingSocial ? 'Sosyal Medya Güncelle' : 'Yeni Sosyal Medya Ekle'}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                {editingSocial ? 'Mevcut sosyal medya bilgilerini güncelleyin' : 'Yeni sosyal medya bağlantısı ekleyin'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-white">Gösterilecek İsim</Label>
                <Input
                  id="name"
                  value={socialForm.name}
                  onChange={(e) => setSocialForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Örn: Telegram Kanalımız"
                  className="bg-white/5 border-white/10 text-white mt-2"
                />
              </div>

              <div>
                <Label htmlFor="platform" className="text-white">Platform</Label>
                <Select
                  value={socialForm.platform}
                  onValueChange={(value) => setSocialForm(prev => ({ ...prev, platform: value }))}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white mt-2">
                    <SelectValue placeholder="Platform seçin" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/10">
                    {SOCIAL_PLATFORMS.map(platform => (
                      <SelectItem key={platform.value} value={platform.value} className="text-white">
                        {platform.icon} {platform.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="username" className="text-white">Kullanıcı Adı / Link</Label>
                <Input
                  id="username"
                  value={socialForm.username}
                  onChange={(e) => setSocialForm(prev => ({ ...prev, username: e.target.value }))}
                  placeholder={socialForm.platform === 'telegram' ? 'supersohbet' : 'kullaniciadi veya tam link'}
                  className="bg-white/5 border-white/10 text-white mt-2"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {socialForm.platform === 'telegram'
                    ? '@ işareti olmadan sadece kullanıcı adı yazın'
                    : 'Kullanıcı adı veya tam link girebilirsiniz'}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setSocialDialog(false)
                  setEditingSocial(null)
                  setSocialForm({ name: '', platform: '', username: '' })
                }}
                disabled={saving}
                className="border-white/20 hover:bg-white/10"
              >
                İptal
              </Button>
              <Button
                onClick={saveSocialMedia}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saving ? 'Kaydediliyor...' : editingSocial ? 'Güncelle' : 'Ekle'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
