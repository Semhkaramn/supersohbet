'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Plus, Edit, Trash2, Heart, Crown, Upload, X, Search, Users } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface Sponsor {
  id: string
  name: string
  description?: string
  logoUrl?: string
  websiteUrl?: string
  category: string
  identifierType: string
  isActive: boolean
  order: number
  clicks: number
}

interface UserSponsorInfo {
  id: string
  identifier: string
  createdAt: string
  user: {
    id: string
    telegramId: string
    siteUsername?: string
    username?: string
    firstName?: string
    lastName?: string
    trc20WalletAddress?: string
  }
  sponsor: {
    id: string
    name: string
    identifierType: string
    category: string
  }
}

interface GroupedUserData {
  userId: string
  telegramId: string
  username?: string
  firstName?: string
  lastName?: string
  trc20WalletAddress?: string
  siteUsername?: string
  sponsors: {
    sponsorId: string
    sponsorName: string
    sponsorCategory: string
    identifierType: string
    identifier: string
    createdAt: string
  }[]
}

export default function AdminSponsorsPage() {
  const router = useRouter()
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [userSponsorInfos, setUserSponsorInfos] = useState<UserSponsorInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [userDataLoading, setUserDataLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('sponsors')

  // Search and filter states for sponsors
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  // Search and filter states for user data
  const [userSearchTerm, setUserSearchTerm] = useState('')
  const [sponsorFilter, setSponsorFilter] = useState<string>('all')

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logoUrl: '',
    websiteUrl: '',
    category: 'normal',
    identifierType: 'username',
    order: 0
  })

  const [uploadingImage, setUploadingImage] = useState(false)
  const [imagePublicId, setImagePublicId] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin')
      return
    }
    loadSponsors()
  }, [])

  useEffect(() => {
    if (activeTab === 'userdata') {
      loadUserSponsorData()
    }
  }, [activeTab])

  async function loadSponsors() {
    try {
      const response = await fetch('/api/admin/sponsors')
      const data = await response.json()
      setSponsors(data.sponsors || [])
    } catch (error) {
      console.error('Error loading sponsors:', error)
      toast.error('Sponsorlar yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  async function loadUserSponsorData() {
    setUserDataLoading(true)
    try {
      const response = await fetch('/api/admin/sponsors?includeUserData=true')
      const data = await response.json()
      setUserSponsorInfos(data.userSponsorInfos || [])
    } catch (error) {
      console.error('Error loading user sponsor data:', error)
      toast.error('Kullanıcı verileri yüklenemedi')
    } finally {
      setUserDataLoading(false)
    }
  }

  function openDialog(sponsor?: Sponsor) {
    if (sponsor) {
      setEditingSponsor(sponsor)
      setFormData({
        name: sponsor.name,
        description: sponsor.description || '',
        logoUrl: sponsor.logoUrl || '',
        websiteUrl: sponsor.websiteUrl || '',
        category: sponsor.category,
        identifierType: sponsor.identifierType || 'username',
        order: sponsor.order
      })
    } else {
      setEditingSponsor(null)
      setFormData({
        name: '',
        description: '',
        logoUrl: '',
        websiteUrl: '',
        category: 'normal',
        identifierType: 'username',
        order: sponsors.length
      })
    }
    setDialogOpen(true)
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Dosya boyutu kontrolü (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Dosya boyutu 5MB\'dan küçük olmalıdır')
      return
    }

    setUploadingImage(true)

    try {
      const formDataUpload = new FormData()
      formDataUpload.append('file', file)
      formDataUpload.append('folder', 'supersohbet/sponsors')

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formDataUpload
      })

      const data = await response.json()

      if (data.success) {
        setFormData(prev => ({ ...prev, logoUrl: data.url }))
        setImagePublicId(data.publicId)
        toast.success('Logo yüklendi')
      } else {
        toast.error(data.error || 'Logo yüklenemedi')
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Logo yüklenirken hata oluştu')
    } finally {
      setUploadingImage(false)
    }
  }

  async function handleRemoveImage() {
    if (!imagePublicId) {
      setFormData(prev => ({ ...prev, logoUrl: '' }))
      return
    }

    try {
      await fetch('/api/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicId: imagePublicId })
      })

      setFormData(prev => ({ ...prev, logoUrl: '' }))
      setImagePublicId(null)
      toast.success('Logo silindi')
    } catch (error) {
      console.error('Image remove error:', error)
      toast.error('Logo silinirken hata oluştu')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      const url = editingSponsor
        ? `/api/admin/sponsors/${editingSponsor.id}`
        : '/api/admin/sponsors'

      const method = editingSponsor ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          logoPublicId: imagePublicId
        })
      })

      const data = await response.json()

      if (data.sponsor) {
        toast.success(editingSponsor ? 'Sponsor güncellendi' : 'Sponsor eklendi')
        setDialogOpen(false)
        setImagePublicId(null)
        loadSponsors()
      } else {
        toast.error(data.error || 'İşlem başarısız')
      }
    } catch (error) {
      console.error('Submit error:', error)
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
      // Önce sponsoru bul ve logosunun public_id'sini al
      const sponsor = sponsors.find(s => s.id === deleteId)

      const response = await fetch(`/api/admin/sponsors/${deleteId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        // Cloudinary'den logoyu sil (varsa)
        if (sponsor?.logoUrl && sponsor.logoUrl.includes('cloudinary')) {
          try {
            const urlParts = sponsor.logoUrl.split('/')
            const publicIdWithExt = urlParts.slice(-2).join('/')
            const publicId = publicIdWithExt.replace(/\.[^/.]+$/, '')

            await fetch('/api/upload', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ publicId })
            })
          } catch (err) {
            console.error('Cloudinary silme hatası:', err)
          }
        }

        toast.success('Sponsor silindi')
        loadSponsors()
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

  async function toggleActive(id: string, currentActive: boolean) {
    try {
      const response = await fetch(`/api/admin/sponsors/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive })
      })

      const data = await response.json()

      if (data.sponsor) {
        toast.success('Durum güncellendi')
        loadSponsors()
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

  // Filter sponsors based on search and category
  const filteredSponsors = sponsors.filter(sponsor => {
    const matchesSearch = sponsor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sponsor.description && sponsor.description.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCategory = categoryFilter === 'all' || sponsor.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  // Group user sponsor info by user
  const groupedUserData: GroupedUserData[] = []
  const userMap = new Map<string, GroupedUserData>()

  userSponsorInfos.forEach(info => {
    const userId = info.user.id
    if (!userMap.has(userId)) {
      userMap.set(userId, {
        userId: info.user.id,
        telegramId: info.user.telegramId,
        siteUsername: info.user.siteUsername,
        username: info.user.username,
        firstName: info.user.firstName,
        lastName: info.user.lastName,
        trc20WalletAddress: info.user.trc20WalletAddress,
        sponsors: []
      })
    }

    const userData = userMap.get(userId)!
    userData.sponsors.push({
      sponsorId: info.sponsor.id,
      sponsorName: info.sponsor.name,
      sponsorCategory: info.sponsor.category,
      identifierType: info.sponsor.identifierType,
      identifier: info.identifier,
      createdAt: info.createdAt
    })
  })

  groupedUserData.push(...userMap.values())

  // Filter grouped user data based on search and sponsor
  const filteredGroupedUserData = groupedUserData.filter(userData => {
    const userName = userData.firstName || userData.username || userData.telegramId
    const matchesSearch = userName.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      (userData.trc20WalletAddress && userData.trc20WalletAddress.toLowerCase().includes(userSearchTerm.toLowerCase())) ||
      userData.sponsors.some(s =>
        s.sponsorName.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        s.identifier.toLowerCase().includes(userSearchTerm.toLowerCase())
      )
    const matchesSponsor = sponsorFilter === 'all' || userData.sponsors.some(s => s.sponsorId === sponsorFilter)
    return matchesSearch && matchesSponsor
  })

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
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
              <Heart className="w-8 h-8" />
              Sponsor Yönetimi
            </h1>
            <p className="text-gray-400 mt-1">Sponsorları yönetin</p>
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="sponsors" className="data-[state=active]:bg-blue-600">
              <Heart className="w-4 h-4 mr-2" />
              Sponsorlar
            </TabsTrigger>
            <TabsTrigger value="userdata" className="data-[state=active]:bg-blue-600">
              <Users className="w-4 h-4 mr-2" />
              Kullanıcı Verileri
            </TabsTrigger>
          </TabsList>

          {/* Sponsors Tab */}
          <TabsContent value="sponsors" className="space-y-6">
            <div className="flex items-center justify-between">
              {/* Search and Filter */}
              <div className="flex flex-col md:flex-row gap-4 flex-1 mr-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Sponsor ara (isim, açıklama)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full md:w-[200px] bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Kategori" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/20">
                    <SelectItem value="all">Tümü</SelectItem>
                    <SelectItem value="vip">VIP Sponsorlar</SelectItem>
                    <SelectItem value="normal">Normal Sponsorlar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => openDialog()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Yeni Sponsor Ekle
              </Button>
            </div>

            {/* Sponsors Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSponsors.length === 0 ? (
                <Card className="col-span-2 bg-white/5 border-white/10 p-12 text-center">
                  <Heart className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">
                    {sponsors.length === 0 ? 'Henüz sponsor eklenmemiş' : 'Arama kriterlerine uygun sponsor bulunamadı'}
                  </p>
                </Card>
              ) : (
                filteredSponsors.map((sponsor) => (
                  <SponsorCard
                    key={sponsor.id}
                    sponsor={sponsor}
                    onEdit={() => openDialog(sponsor)}
                    onDelete={() => handleDelete(sponsor.id)}
                    onToggleActive={() => toggleActive(sponsor.id, sponsor.isActive)}
                  />
                ))
              )}
            </div>
          </TabsContent>

          {/* User Data Tab */}
          <TabsContent value="userdata" className="space-y-6">
            {/* Search and Filter for User Data */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Kullanıcı veya sponsor bilgisi ara..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                />
              </div>
              <Select value={sponsorFilter} onValueChange={setSponsorFilter}>
                <SelectTrigger className="w-full md:w-[250px] bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Sponsor Filtrele" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/20">
                  <SelectItem value="all">Tüm Sponsorlar</SelectItem>
                  {sponsors.map((sponsor) => (
                    <SelectItem key={sponsor.id} value={sponsor.id}>
                      {sponsor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* User Data List */}
            {userDataLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : filteredGroupedUserData.length === 0 ? (
              <Card className="bg-white/5 border-white/10 p-12 text-center">
                <Users className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">
                  {userSponsorInfos.length === 0 ? 'Henüz kullanıcı verisi yok' : 'Arama kriterlerine uygun veri bulunamadı'}
                </p>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredGroupedUserData.map((userData) => (
                  <Card key={userData.userId} className="bg-white/5 border-white/10 p-5 hover:bg-white/10 transition-colors">
                    <div className="space-y-4">
                      {/* User Info Header */}
                      <div className="flex items-start justify-between border-b border-white/10 pb-3">
                        <div>
                          <h3 className="text-white font-bold text-lg">
                            {userData.siteUsername || userData.firstName || userData.username || 'Kullanıcı'}
                          </h3>
                          <p className="text-sm text-gray-400">
                            @{userData.username || userData.telegramId}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-gray-500">Toplam Sponsor</span>
                          <p className="text-2xl font-bold text-blue-400">{userData.sponsors.length}</p>
                        </div>
                      </div>

                      {/* TRC20 Wallet Address */}
                      {userData.trc20WalletAddress && (
                        <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-green-400 font-semibold text-sm">💰 TRC20 Cüzdan Adresi:</span>
                          </div>
                          <span className="text-white font-mono text-sm break-all">{userData.trc20WalletAddress}</span>
                        </div>
                      )}

                      {/* Sponsors List */}
                      <div className="space-y-2">
                        <h4 className="text-white font-semibold text-sm flex items-center gap-2">
                          <Heart className="w-4 h-4 text-pink-400" />
                          Sponsor Bilgileri:
                        </h4>
                        {userData.sponsors.map((sponsor, index) => (
                          <div key={`${userData.userId}-${sponsor.sponsorId}`} className="p-3 bg-white/5 border border-white/10 rounded-lg">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-white font-medium">{sponsor.sponsorName}</span>
                                  {sponsor.sponsorCategory === 'vip' && (
                                    <Crown className="w-4 h-4 text-yellow-400" />
                                  )}
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                    sponsor.sponsorCategory === 'vip'
                                      ? 'bg-yellow-500/20 text-yellow-400'
                                      : 'bg-blue-500/20 text-blue-400'
                                  }`}>
                                    {sponsor.sponsorCategory === 'vip' ? 'VIP' : 'Normal'}
                                  </span>
                                </div>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500">
                                      {sponsor.identifierType === 'username' ? 'Kullanıcı Adı:' :
                                       sponsor.identifierType === 'id' ? 'ID:' : 'Email:'}
                                    </span>
                                    <span className="text-sm text-blue-300 font-mono">{sponsor.identifier}</span>
                                  </div>
                                  <p className="text-xs text-gray-500">
                                    Kayıt: {new Date(sponsor.createdAt).toLocaleString('tr-TR')}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-900 border-white/20 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingSponsor ? 'Sponsoru Düzenle' : 'Yeni Sponsor Ekle'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-white">Sponsor Adı</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-white/5 border-white/10 text-white mt-1"
                placeholder="Sponsor adı"
                required
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-white">Açıklama</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-white/5 border-white/10 text-white mt-1"
                placeholder="Sponsor açıklaması"
                rows={3}
              />
            </div>

            <div>
              <Label className="text-white">Sponsor Logosu</Label>
              <div className="mt-2 space-y-2">
                {formData.logoUrl ? (
                  <div className="relative">
                    <img
                      src={formData.logoUrl}
                      alt="Logo"
                      className="w-full h-48 object-contain rounded-lg border border-white/10 bg-white/5 p-4"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-white/10 rounded-lg p-6 text-center">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <Input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/gif,image/svg+xml,image/webp,video/webm"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="bg-white/5 border-white/10 text-white"
                    />
                    <p className="text-xs text-gray-400 mt-2">
                      {uploadingImage ? 'Yükleniyor...' : 'PNG, JPG, GIF, SVG, WebP, WebM (Max 5MB)'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="websiteUrl" className="text-white">Website URL</Label>
              <Input
                id="websiteUrl"
                value={formData.websiteUrl}
                onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                className="bg-white/5 border-white/10 text-white mt-1"
                placeholder="https://..."
              />
            </div>

            <div>
              <Label htmlFor="category" className="text-white">Kategori</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1">
                  <SelectValue placeholder="Kategori seçin" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/20">
                  <SelectItem value="normal" className="text-white">Normal</SelectItem>
                  <SelectItem value="vip" className="text-white">VIP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="identifierType" className="text-white">Kullanıcıdan İstenecek Bilgi</Label>
              <Select
                value={formData.identifierType}
                onValueChange={(value) => setFormData({ ...formData, identifierType: value })}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1">
                  <SelectValue placeholder="Bilgi tipi seçin" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/20">
                  <SelectItem value="username" className="text-white">Kullanıcı Adı</SelectItem>
                  <SelectItem value="id" className="text-white">ID</SelectItem>
                  <SelectItem value="email" className="text-white">Email</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-white/40 mt-1">
                Kullanıcılar bu sponsora ait ürünleri alırken hangi bilgiyi girecekler
              </p>
            </div>

            <div>
              <Label htmlFor="order" className="text-white">Sıralama</Label>
              <Input
                id="order"
                type="number"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                className="bg-white/5 border-white/10 text-white mt-1"
                min="0"
                required
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="flex-1 border-white/20 hover:bg-white/10"
              >
                İptal
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {editingSponsor ? 'Güncelle' : 'Ekle'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Sponsor Silme"
        description={`Bu sponsoru silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`}
        onConfirm={confirmDelete}
      />
    </div>
  )
}

// Sponsor Card Component
function SponsorCard({
  sponsor,
  onEdit,
  onDelete,
  onToggleActive
}: {
  sponsor: Sponsor
  onEdit: () => void
  onDelete: () => void
  onToggleActive: () => void
}) {
  return (
    <Card className="bg-white/5 border-white/10 p-4">
      <div className="flex gap-4">
        {sponsor.logoUrl && (
          <img
            src={sponsor.logoUrl}
            alt={sponsor.name}
            className="w-16 h-16 object-contain rounded-lg bg-white/5 p-2"
          />
        )}
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-white">{sponsor.name}</h3>
                {sponsor.category === 'vip' && (
                  <Crown className="w-4 h-4 text-yellow-400" />
                )}
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  sponsor.isActive
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {sponsor.isActive ? 'Aktif' : 'Pasif'}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  sponsor.category === 'vip'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {sponsor.category === 'vip' ? 'VIP' : 'Normal'}
                </span>
              </div>
              <p className="text-gray-400 text-sm mt-1">{sponsor.description}</p>
              {sponsor.websiteUrl && (
                <a
                  href={sponsor.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 text-sm hover:underline block mt-1"
                >
                  {sponsor.websiteUrl}
                </a>
              )}
              <div className="flex gap-3 mt-2">
                <span className="text-green-400 text-sm">{sponsor.clicks} tıklama</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              variant="outline"
              onClick={onToggleActive}
              className="border-white/20 hover:bg-white/10"
            >
              {sponsor.isActive ? 'Devre Dışı' : 'Aktif Et'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onEdit}
              className="border-white/20 hover:bg-white/10"
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onDelete}
              className="border-red-500/20 hover:bg-red-500/10 text-red-400"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
