'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Plus, Edit, Trash2, ShoppingCart, Package, Clock, CheckCircle, XCircle, AlertCircle, Upload } from 'lucide-react'
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
  purchaseLimit?: number
  isActive: boolean
  order: number
  _count?: {
    purchases: number
  }
}

interface Order {
  id: string
  userId: string
  itemId: string
  pointsSpent: number
  status: string
  deliveryInfo?: string
  processedBy?: string
  processedAt?: string
  purchasedAt: string
  user: {
    id: string
    telegramId: string
    username?: string
    firstName?: string
    lastName?: string
  }
  item: {
    id: string
    name: string
    description?: string
    price: number
    imageUrl?: string
    category: string
  }
}

export default function AdminShopPage() {
  const router = useRouter()
  const [items, setItems] = useState<ShopItem[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [orderDialogOpen, setOrderDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ShopItem | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [activeTab, setActiveTab] = useState('products')

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    imageUrl: '',
    category: 'Genel',
    stock: null as number | null,
    purchaseLimit: null as number | null,
    order: 0
  })

  const [orderFormData, setOrderFormData] = useState({
    status: '',
    deliveryInfo: ''
  })
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin')
      return
    }
    loadItems()
    loadOrders()
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

  async function loadOrders() {
    try {
      setOrdersLoading(true)
      const response = await fetch('/api/admin/shop/orders')
      const data = await response.json()
      setOrders(data.orders || [])
    } catch (error) {
      console.error('Error loading orders:', error)
      toast.error('Siparişler yüklenemedi')
    } finally {
      setOrdersLoading(false)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData
      })

      const data = await response.json()

      if (data.url) {
        setFormData({ ...formData, imageUrl: data.url })
        toast.success('Dosya yüklendi!')
      } else {
        toast.error(data.error || 'Yükleme başarısız')
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Dosya yüklenemedi')
    } finally {
      setUploading(false)
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
        purchaseLimit: item.purchaseLimit ?? null,
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
        purchaseLimit: null,
        order: items.length
      })
    }
    setDialogOpen(true)
  }

  function openOrderDialog(order: Order) {
    setSelectedOrder(order)
    setOrderFormData({
      status: order.status,
      deliveryInfo: order.deliveryInfo || ''
    })
    setOrderDialogOpen(true)
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

  async function handleOrderUpdate(e: React.FormEvent) {
    e.preventDefault()

    if (!selectedOrder) return

    try {
      const response = await fetch(`/api/admin/shop/order/${selectedOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...orderFormData,
          processedBy: 'Admin' // Admin kullanıcı adını buraya ekleyebilirsiniz
        })
      })

      const data = await response.json()

      if (data.order) {
        toast.success('Sipariş güncellendi')
        setOrderDialogOpen(false)
        loadOrders(statusFilter)
      } else {
        toast.error(data.error || 'Güncelleme başarısız')
      }
    } catch (error) {
      console.error('Order update error:', error)
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

  async function handleDeleteOrder(id: string) {
    if (!confirm('Bu siparişi silmek istediğinizden emin misiniz?')) return

    try {
      const response = await fetch(`/api/admin/shop/order/${id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Sipariş silindi')
        loadOrders(statusFilter)
      } else {
        toast.error(data.error || 'Silme başarısız')
      }
    } catch (error) {
      console.error('Delete order error:', error)
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

  function getStatusBadge(status: string) {
    const badges = {
      pending: { icon: Clock, color: 'bg-yellow-500/20 text-yellow-400', text: 'Bekliyor' },
      processing: { icon: AlertCircle, color: 'bg-blue-500/20 text-blue-400', text: 'İşleniyor' },
      completed: { icon: CheckCircle, color: 'bg-green-500/20 text-green-400', text: 'Tamamlandı' },
      cancelled: { icon: XCircle, color: 'bg-red-500/20 text-red-400', text: 'İptal' }
    }

    const badge = badges[status as keyof typeof badges] || badges.pending
    const Icon = badge.icon

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.text}
      </span>
    )
  }

  function getOrderStats() {
    return {
      total: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      processing: orders.filter(o => o.status === 'processing').length,
      completed: orders.filter(o => o.status === 'completed').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  const stats = getOrderStats()

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
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
            <p className="text-gray-400 mt-1">Ürünleri ve siparişleri yönetin</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="products" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="products" className="data-[state=active]:bg-blue-600">
              <Package className="w-4 h-4 mr-2" />
              Ürünler
            </TabsTrigger>
            <TabsTrigger value="orders" className="data-[state=active]:bg-blue-600">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Siparişler
              {stats.pending > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-yellow-500 text-white text-xs rounded-full">
                  {stats.pending}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-4">
            <div className="flex justify-end">
              <Button
                onClick={() => openDialog()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Yeni Ürün Ekle
              </Button>
            </div>

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
                              {item.purchaseLimit !== null && (
                                <span className="text-pink-400 text-sm">Limit: {item.purchaseLimit}x/kişi</span>
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
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            {/* Order Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card className="bg-white/5 border-white/10 p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{stats.total}</div>
                  <div className="text-sm text-gray-400">Toplam</div>
                </div>
              </Card>
              <Card className="bg-yellow-500/10 border-yellow-500/20 p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
                  <div className="text-sm text-yellow-400">Bekliyor</div>
                </div>
              </Card>
              <Card className="bg-blue-500/10 border-blue-500/20 p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{stats.processing}</div>
                  <div className="text-sm text-blue-400">İşleniyor</div>
                </div>
              </Card>
              <Card className="bg-green-500/10 border-green-500/20 p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">{stats.completed}</div>
                  <div className="text-sm text-green-400">Tamamlandı</div>
                </div>
              </Card>
              <Card className="bg-red-500/10 border-red-500/20 p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400">{stats.cancelled}</div>
                  <div className="text-sm text-red-400">İptal</div>
                </div>
              </Card>
            </div>

            {/* Filter */}
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={(value) => {
                  setStatusFilter(value)
                  loadOrders(value)
                }}>
                  <SelectTrigger className="w-48 bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Durum Filtrele" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/20">
                    <SelectItem value="all">Tümü</SelectItem>
                    <SelectItem value="pending">Bekliyor</SelectItem>
                    <SelectItem value="processing">İşleniyor</SelectItem>
                    <SelectItem value="completed">Tamamlandı</SelectItem>
                    <SelectItem value="cancelled">İptal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Orders List */}
            {ordersLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : orders.length === 0 ? (
              <Card className="bg-white/5 border-white/10 p-12 text-center">
                <Package className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">Sipariş bulunamadı</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
                  <Card key={order.id} className="bg-white/5 border-white/10 p-4 hover:bg-white/10 transition-colors">
                    <div className="flex gap-4">
                      {order.item.imageUrl && (
                        <img
                          src={order.item.imageUrl}
                          alt={order.item.name}
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-lg font-semibold text-white">{order.item.name}</h3>
                            <p className="text-sm text-gray-400">
                              {order.user.firstName || order.user.username || 'Kullanıcı'}
                              {' '}(@{order.user.username || order.user.telegramId})
                            </p>
                          </div>
                          {getStatusBadge(order.status)}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <span className="text-gray-400">Fiyat:</span>
                            <span className="text-yellow-400 font-semibold ml-1">{order.pointsSpent} Puan</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Tarih:</span>
                            <span className="text-white ml-1">
                              {new Date(order.purchasedAt).toLocaleDateString('tr-TR')}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">Saat:</span>
                            <span className="text-white ml-1">
                              {new Date(order.purchasedAt).toLocaleTimeString('tr-TR')}
                            </span>
                          </div>
                          {order.processedBy && (
                            <div>
                              <span className="text-gray-400">İşleyen:</span>
                              <span className="text-white ml-1">{order.processedBy}</span>
                            </div>
                          )}
                        </div>

                        {order.deliveryInfo && (
                          <div className="mt-2 p-2 bg-white/5 rounded text-sm">
                            <span className="text-gray-400">Not: </span>
                            <span className="text-white">{order.deliveryInfo}</span>
                          </div>
                        )}

                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openOrderDialog(order)}
                            className="border-white/20 hover:bg-white/10"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Düzenle
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteOrder(order.id)}
                            className="border-red-500/20 hover:bg-red-500/10 text-red-400"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Sil
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Add/Edit Product Dialog */}
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
              <div className="mt-2 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="file"
                    id="shop-file-upload"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('shop-file-upload')?.click()}
                    disabled={uploading}
                    className="border-white/20 hover:bg-white/10"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? 'Yükleniyor...' : 'Dosya Yükle'}
                  </Button>
                  {formData.imageUrl && (
                    <img src={formData.imageUrl} alt="Preview" className="h-10 w-10 object-contain rounded bg-white/5" />
                  )}
                </div>
                <p className="text-xs text-blue-300">
                  💡 <strong>Deploy Modu:</strong> Sistem Ayarları'nda "Upload URL" ayarını yaparsanız,
                  dosyalar otomatik olarak Hostinger sitenize yüklenecektir.
                </p>
                <p className="text-xs text-gray-400">
                  Ayar yapılmazsa dosyalar yerel sunucuya yüklenir. Örnek URL: https://siteniz.com/uploads/upload.php
                </p>
              </div>
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
              <Label htmlFor="purchaseLimit" className="text-white">Alım Sınırlaması (Boş = Sınırsız)</Label>
              <Input
                id="purchaseLimit"
                type="number"
                value={formData.purchaseLimit || ''}
                onChange={(e) => setFormData({ ...formData, purchaseLimit: e.target.value ? parseInt(e.target.value) : null })}
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

      {/* Edit Order Dialog */}
      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent className="bg-slate-900 border-white/20">
          <DialogHeader>
            <DialogTitle className="text-white">Sipariş Düzenle</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <form onSubmit={handleOrderUpdate} className="space-y-4">
              <div className="bg-white/5 p-3 rounded">
                <div className="text-sm text-gray-400">Ürün</div>
                <div className="text-white font-semibold">{selectedOrder.item.name}</div>
                <div className="text-sm text-gray-400 mt-1">
                  Müşteri: {selectedOrder.user.firstName || selectedOrder.user.username}
                </div>
              </div>

              <div>
                <Label htmlFor="status" className="text-white">Sipariş Durumu</Label>
                <Select value={orderFormData.status} onValueChange={(value) => setOrderFormData({ ...orderFormData, status: value })}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/20">
                    <SelectItem value="pending">Bekliyor</SelectItem>
                    <SelectItem value="processing">İşleniyor</SelectItem>
                    <SelectItem value="completed">Tamamlandı</SelectItem>
                    <SelectItem value="cancelled">İptal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="deliveryInfo" className="text-white">Teslimat/Not Bilgisi</Label>
                <Textarea
                  id="deliveryInfo"
                  value={orderFormData.deliveryInfo}
                  onChange={(e) => setOrderFormData({ ...orderFormData, deliveryInfo: e.target.value })}
                  className="bg-white/5 border-white/10 text-white mt-1"
                  placeholder="Teslimat bilgileri veya notlar..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOrderDialogOpen(false)}
                  className="flex-1 border-white/20 hover:bg-white/10"
                >
                  İptal
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  Güncelle
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
