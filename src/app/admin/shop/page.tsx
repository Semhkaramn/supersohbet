'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ArrowLeft, Plus, Edit, Trash2, ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface ShopItem {
  id: string
  name: string
  description?: string
  price: number
  imageUrl?: string
  category: string
  stock?: number
  isActive: boolean
  order: number
  _count?: {
    purchases: number
  }
}

export default function AdminShopPage() {
  const router = useRouter()
  const [items, setItems] = useState<ShopItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ShopItem | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    imageUrl: '',
    category: 'Genel',
    stock: null as number | null,
    order: 0
  })

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin')
      return
    }
    loadItems()
  }, [])

  async function loadItems() {
    try {
      const response = await fetch('/api/admin/shop')
      const data = await response.json()
      setItems(data.items || [])
    } catch (error) {
      console.error('Error loading items:', error)
      toast.error('Ürünler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  function openDialog(item?: ShopItem) {
    if (item) {
      setEditingItem(item)
      setFormData({
        name: item.name,
        description: item.description || '',
        price: item.price,
        imageUrl: item.imageUrl || '',
        category: item.category,
        stock: item.stock ?? null,
        order: item.order
      })
    } else {
      setEditingItem(null)
      setFormData({
        name: '',
        description: '',
        price: 0,
        imageUrl: '',
        category: 'Genel',
        stock: null,
        order: items.length
      })
    }
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      const url = editingItem
        ? `/api/admin/shop/${editingItem.id}`
        : '/api/admin/shop'

      const method = editingItem ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (data.item) {
        toast.success(editingItem ? 'Ürün güncellendi' : 'Ürün eklendi')
        setDialogOpen(false)
        loadItems()
      } else {
        toast.error(data.error || 'İşlem başarısız')
      }
    } catch (error) {
      console.error('Submit error:', error)
      toast.error('Bir hata oluştu')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Bu ürünü silmek istediğinizden emin misiniz?')) return

    try {
      const response = await fetch(`/api/admin/shop/${id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Ürün silindi')
        loadItems()
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
      const response = await fetch(`/api/admin/shop/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive })
      })

      const data = await response.json()

      if (data.item) {
        toast.success('Durum güncellendi')
        loadItems()
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
              <ShoppingCart className="w-8 h-8" />
              Market Yönetimi
            </h1>
            <p className="text-gray-400 mt-1">Ürünleri yönetin</p>
          </div>
          <Button
            onClick={() => openDialog()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Yeni Ürün Ekle
          </Button>
        </div>

        {/* Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.length === 0 ? (
            <Card className="col-span-2 bg-white/5 border-white/10 p-12 text-center">
              <ShoppingCart className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">Henüz ürün eklenmemiş</p>
            </Card>
          ) : (
            items.map((item) => (
              <Card key={item.id} className="bg-white/5 border-white/10 p-4">
                <div className="flex gap-4">
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-white">{item.name}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item.isActive
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {item.isActive ? 'Aktif' : 'Pasif'}
                          </span>
                        </div>
                        <p className="text-gray-400 text-sm mt-1">{item.description}</p>
                        <div className="flex gap-3 mt-2">
                          <span className="text-yellow-400 font-semibold">{item.price} Puan</span>
                          <span className="text-gray-400 text-sm">{item.category}</span>
                          {item.stock !== null && (
                            <span className="text-blue-400 text-sm">Stok: {item.stock}</span>
                          )}
                          {item._count && (
                            <span className="text-green-400 text-sm">{item._count.purchases} satış</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleActive(item.id, item.isActive)}
                        className="border-white/20 hover:bg-white/10"
                      >
                        {item.isActive ? 'Devre Dışı' : 'Aktif Et'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openDialog(item)}
                        className="border-white/20 hover:bg-white/10"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(item.id)}
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
              {editingItem ? 'Ürünü Düzenle' : 'Yeni Ürün Ekle'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-white">Ürün Adı</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-white/5 border-white/10 text-white mt-1"
                placeholder="Ürün adı"
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
                placeholder="Ürün açıklaması"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="price" className="text-white">Fiyat (Puan)</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) })}
                className="bg-white/5 border-white/10 text-white mt-1"
                min="0"
                required
              />
            </div>

            <div>
              <Label htmlFor="imageUrl" className="text-white">Resim URL</Label>
              <Input
                id="imageUrl"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                className="bg-white/5 border-white/10 text-white mt-1"
                placeholder="https://..."
              />
            </div>

            <div>
              <Label htmlFor="category" className="text-white">Kategori</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="bg-white/5 border-white/10 text-white mt-1"
                placeholder="Genel"
                required
              />
            </div>

            <div>
              <Label htmlFor="stock" className="text-white">Stok (Boş = Sınırsız)</Label>
              <Input
                id="stock"
                type="number"
                value={formData.stock || ''}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value ? parseInt(e.target.value) : null })}
                className="bg-white/5 border-white/10 text-white mt-1"
                min="0"
                placeholder="Sınırsız"
              />
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
                {editingItem ? 'Güncelle' : 'Ekle'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
