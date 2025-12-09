'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Plus, Edit, Trash2, Heart, Crown, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface Sponsor {
  id: string
  name: string
  description?: string
  logoUrl?: string
  websiteUrl?: string
  category: string
  isActive: boolean
  order: number
  clicks: number
}

export default function AdminSponsorsPage() {
  const router = useRouter()
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logoUrl: '',
    websiteUrl: '',
    category: 'normal',
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

  function openDialog(sponsor?: Sponsor) {
    if (sponsor) {
      setEditingSponsor(sponsor)
      setFormData({
        name: sponsor.name,
        description: sponsor.description || '',
        logoUrl: sponsor.logoUrl || '',
        websiteUrl: sponsor.websiteUrl || '',
        category: sponsor.category,
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
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'supersohbet/sponsors')

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
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
    if (!confirm('Bu sponsoru silmek istediğinizden emin misiniz?')) return

    try {
      // Önce sponsoru bul ve logosunun public_id'sini al
      const sponsor = sponsors.find(s => s.id === id)

      const response = await fetch(`/api/admin/sponsors/${id}`, {
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
          {sponsors.length === 0 ? (
            <Card className="col-span-2 bg-white/5 border-white/10 p-12 text-center">
              <Heart className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">Henüz sponsor eklenmemiş</p>
            </Card>
          ) : (
            sponsors.map((sponsor) => (
              <Card key={sponsor.id} className="bg-white/5 border-white/10 p-4">
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
                        onClick={() => toggleActive(sponsor.id, sponsor.isActive)}
                        className="border-white/20 hover:bg-white/10"
                      >
                        {sponsor.isActive ? 'Devre Dışı' : 'Aktif Et'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openDialog(sponsor)}
                        className="border-white/20 hover:bg-white/10"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(sponsor.id)}
                        className="border-red-500/20 hover:bg-red-500/10 text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
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
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="bg-white/5 border-white/10 text-white"
                    />
                    <p className="text-xs text-gray-400 mt-2">
                      {uploadingImage ? 'Yükleniyor...' : 'PNG, JPG, GIF (Max 5MB)'}
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
    </div>
  )
}
