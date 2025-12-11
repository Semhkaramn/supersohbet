'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import DashboardLayout from '@/components/DashboardLayout'
import { ShoppingBag, Coins, Heart, Package, Clock, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

interface ShopItem {
  id: string
  name: string
  description?: string
  price: number
  imageUrl?: string
  category: string
  stock?: number
}

interface UserData {
  points: number
}

interface Purchase {
  id: string
  item: {
    name: string
    description?: string
    imageUrl?: string
  }
  pointsSpent: number
  status: string
  purchasedAt: string
}

function ShopContent() {
  const router = useRouter()
  const { user, setShowLoginModal } = useAuth()

  const [items, setItems] = useState<ShopItem[]>([])
  const [userData, setUserData] = useState<UserData | null>(null)
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [selectedCategory, setSelectedCategory] = useState('Tüm Kategoriler')
  const [loading, setLoading] = useState(true)
  const [loadingPurchases, setLoadingPurchases] = useState(false)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null)
  const [walletInfoDialogOpen, setWalletInfoDialogOpen] = useState(false)
  const [sponsorInfoDialogOpen, setSponsorInfoDialogOpen] = useState(false)
  const [sponsorInfoData, setSponsorInfoData] = useState<{ sponsorName?: string; identifierType?: string } | null>(null)

  useEffect(() => {
    loadData()
  }, [user])

  async function loadData() {
    try {
      const itemsRes = await fetch('/api/shop/items')
      const itemsData = await itemsRes.json()
      setItems(itemsData.items || [])

      // Only load user data if logged in
      if (user) {
        const userRes = await fetch('/api/user/me')
        if (userRes.ok) {
          const userData = await userRes.json()
          setUserData(userData)
        }
      }
    } catch (error) {
      console.error('Error loading shop data:', error)
      toast.error('Veriler yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  async function loadPurchases(silent = false) {
    // Only load purchases if logged in
    if (!user) return

    // Sessiz güncelleme değilse loading göster
    if (!silent) {
      setLoadingPurchases(true)
    }

    try {
      const response = await fetch('/api/user/me/purchases')
      const data = await response.json()
      setPurchases(data.purchases || [])
    } catch (error) {
      console.error('Error loading purchases:', error)
      // Sessiz güncellemede hata mesajı gösterme
      if (!silent) {
        toast.error('Siparişler yüklenirken hata oluştu')
      }
    } finally {
      if (!silent) {
        setLoadingPurchases(false)
      }
    }
  }

  function openPurchaseConfirm(item: ShopItem) {
    // Check if user is logged in
    if (!user) {
      toast.error('Satın almak için giriş yapmalısınız')
      setShowLoginModal(true)
      return
    }

    if (!userData || userData.points < item.price) {
      toast.error('Yetersiz puan!')
      return
    }
    setSelectedItem(item)
    setConfirmDialogOpen(true)
  }

  async function confirmPurchase() {
    if (!selectedItem) return

    setConfirmDialogOpen(false)

    try {
      const response = await fetch('/api/shop/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: selectedItem.id })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Satın alma başarılı! 🎉')
        loadData()
        loadPurchases(true) // Siparişleri sessizce güncelle
      } else {
        // TRC20 cüzdan bilgisi gerekiyorsa dialog göster
        if (data.error && data.error.includes('TRC20') || data.error && data.error.includes('cüzdan')) {
          setWalletInfoDialogOpen(true)
          return
        }

        // Sponsor bilgisi gerekiyorsa dialog göster
        if (data.requiresSponsorInfo) {
          setSponsorInfoData({
            sponsorName: data.sponsorName,
            identifierType: data.identifierType
          })
          setSponsorInfoDialogOpen(true)
          return
        }

        toast.error(data.error || 'Satın alma başarısız')
      }
    } catch (error) {
      console.error('Purchase error:', error)
      toast.error('Bir hata oluştu')
    } finally {
      setSelectedItem(null)
    }
  }

  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'pending': 'Bekliyor',
      'processing': 'Hazırlanıyor',
      'completed': 'Teslim Edildi',
      'cancelled': 'İptal Edildi'
    }
    return statusMap[status] || status
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />
      case 'processing':
        return <Package className="w-4 h-4 text-orange-400" />
      case 'cancelled':
        return <Clock className="w-4 h-4 text-red-400" />
      default:
        return <Clock className="w-4 h-4 text-yellow-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'processing':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      case 'cancelled':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      default:
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    }
  }

  const categories = ['Tüm Kategoriler', ...new Set(items.map(item => item.category))]
  const filteredItems = selectedCategory === 'Tüm Kategoriler'
    ? items
    : items.filter(item => item.category === selectedCategory)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Points Display */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        <Card className="bg-white/5 border-white/10 p-3">
          <div className="flex items-center justify-center gap-2">
            <Coins className="w-5 h-5 text-yellow-300" />
            <span className="text-xl font-bold text-white">{userData?.points || 0}</span>
            <span className="text-white/60 text-sm">Puan</span>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="max-w-2xl mx-auto px-4">
        <Tabs defaultValue="products" className="w-full" onValueChange={(value) => {
          if (value === 'orders') {
            loadPurchases(true) // Sessizce güncelle
          }
        }}>
          <TabsList className="grid w-full grid-cols-2 bg-white/5 border-white/10 mb-4">
            <TabsTrigger value="products" className="data-[state=active]:bg-emerald-600">
              <ShoppingBag className="w-4 h-4 mr-2" />
              Ürünler
            </TabsTrigger>
            <TabsTrigger value="orders" className="data-[state=active]:bg-emerald-600">
              <Package className="w-4 h-4 mr-2" />
              Siparişlerim
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-4">
            {/* Category Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-white text-emerald-600'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Items Grid */}
            {filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingBag className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">Henüz ürün bulunmuyor</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {filteredItems.map(item => (
                  <Card key={item.id} className="bg-white/5 backdrop-blur-sm border-white/10 overflow-hidden">
                    {item.imageUrl && (
                      <div className="aspect-square bg-gradient-to-br from-blue-500/20 to-purple-500/20 relative">
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="p-3">
                      <h3 className="font-semibold text-white mb-1 line-clamp-1">{item.name}</h3>
                      {item.description && (
                        <p className="text-xs text-gray-400 mb-2 line-clamp-2">{item.description}</p>
                      )}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1">
                          <Coins className="w-4 h-4 text-yellow-400" />
                          <span className="font-bold text-yellow-300">{item.price}</span>
                        </div>
                        {item.stock !== null && (
                          <Badge variant="outline" className="text-xs">
                            Stok: {item.stock}
                          </Badge>
                        )}
                      </div>
                      <Button
                        onClick={() => openPurchaseConfirm(item)}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                        size="sm"
                      >
                        <Heart className="w-4 h-4 mr-1" />
                        Al
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="orders">
            {!user ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">Siparişlerinizi görmek için giriş yapmalısınız</p>
                <Button
                  onClick={() => setShowLoginModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Giriş Yap
                </Button>
              </div>
            ) : loadingPurchases ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : purchases.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">Henüz siparişiniz yok</p>
              </div>
            ) : (
              <div className="space-y-3">
                {purchases.map(purchase => (
                  <Card key={purchase.id} className="bg-white/5 border-white/10 p-4">
                    <div className="flex gap-4">
                      {purchase.item.imageUrl && (
                        <div className="w-20 h-20 rounded-lg overflow-hidden bg-gradient-to-br from-blue-500/20 to-purple-500/20 relative flex-shrink-0">
                          <Image
                            src={purchase.item.imageUrl}
                            alt={purchase.item.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white mb-1">{purchase.item.name}</h3>
                        {purchase.item.description && (
                          <p className="text-xs text-gray-400 mb-2 line-clamp-2">{purchase.item.description}</p>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <Coins className="w-4 h-4 text-yellow-400" />
                            <span className="font-bold text-yellow-300">{purchase.pointsSpent}</span>
                          </div>
                          <Badge className={`text-xs flex items-center gap-1 ${getStatusColor(purchase.status)}`}>
                            {getStatusIcon(purchase.status)}
                            {getStatusText(purchase.status)}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          {new Date(purchase.purchasedAt).toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Wallet Info Dialog */}
      <AlertDialog open={walletInfoDialogOpen} onOpenChange={setWalletInfoDialogOpen}>
        <AlertDialogContent className="bg-slate-900 border-slate-700 max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white text-xl">
              Cüzdan Bilgisi Gerekli
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              <div className="space-y-3 py-4">
                <p>Bu ürünü satın alabilmek için TRC20 cüzdan adresinizi eklemeniz gerekmektedir.</p>
                <p className="text-sm text-gray-400">Cüzdan bilgilerinizi eklemek için Cüzdan Bilgileri sayfasına yönlendirileceksiniz.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/10 text-white border-white/20 hover:bg-white/20">
              İptal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setWalletInfoDialogOpen(false)
                router.push(`/wallet-info`)
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Cüzdan Bilgilerine Git
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sponsor Info Dialog */}
      <AlertDialog open={sponsorInfoDialogOpen} onOpenChange={setSponsorInfoDialogOpen}>
        <AlertDialogContent className="bg-slate-900 border-slate-700 max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white text-xl">
              Sponsor Bilgisi Gerekli
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              <div className="space-y-3 py-4">
                <p>Bu ürünü satın alabilmek için sponsor bilginizi eklemeniz gerekmektedir.</p>
                {sponsorInfoData?.sponsorName && (
                  <p className="text-sm">
                    <span className="font-semibold text-white">Sponsor: </span>
                    {sponsorInfoData.sponsorName}
                  </p>
                )}
                {sponsorInfoData?.identifierType && (
                  <p className="text-sm">
                    <span className="font-semibold text-white">Gerekli Bilgi: </span>
                    {sponsorInfoData.identifierType === 'username' ? 'Kullanıcı Adı' :
                     sponsorInfoData.identifierType === 'phone' ? 'Telefon Numarası' :
                     sponsorInfoData.identifierType === 'email' ? 'E-posta' : 'ID'}
                  </p>
                )}
                <p className="text-sm text-gray-400">Sponsor bilgilerinizi eklemek için Cüzdan Bilgileri sayfasına yönlendirileceksiniz.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/10 text-white border-white/20 hover:bg-white/20">
              İptal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setSponsorInfoDialogOpen(false)
                router.push(`/wallet-info`)
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Sponsor Bilgilerine Git
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Purchase Confirmation Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent className="bg-gray-900 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Satın Alma Onayı</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              {selectedItem && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    {selectedItem.imageUrl && (
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-blue-500/20 to-purple-500/20 relative">
                        <Image
                          src={selectedItem.imageUrl}
                          alt={selectedItem.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-white">{selectedItem.name}</p>
                      {selectedItem.description && (
                        <p className="text-sm text-gray-400">{selectedItem.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Ürün Fiyatı:</span>
                      <div className="flex items-center gap-1">
                        <Coins className="w-4 h-4 text-yellow-400" />
                        <span className="font-bold text-yellow-300">{selectedItem.price}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Mevcut Puanınız:</span>
                      <div className="flex items-center gap-1">
                        <Coins className="w-4 h-4 text-yellow-400" />
                        <span className="font-bold text-yellow-300">{userData?.points || 0}</span>
                      </div>
                    </div>
                    <div className="border-t border-white/10 pt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Kalan Puan:</span>
                        <div className="flex items-center gap-1">
                          <Coins className="w-4 h-4 text-yellow-400" />
                          <span className="font-bold text-yellow-300">
                            {(userData?.points || 0) - selectedItem.price}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-center text-gray-400">
                    Bu ürünü satın almak istediğinizden emin misiniz?
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/10 text-white border-white/20 hover:bg-white/20">
              İptal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmPurchase}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Satın Al
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function ShopPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }>
        <ShopContent />
      </Suspense>
    </DashboardLayout>
  )
}
