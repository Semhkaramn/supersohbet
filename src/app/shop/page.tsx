'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import BottomNav from '@/components/BottomNav'
import { ShoppingBag, Coins, Heart } from 'lucide-react'
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

function ShopContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const userId = searchParams.get('userId')

  const [items, setItems] = useState<ShopItem[]>([])
  const [userData, setUserData] = useState<UserData | null>(null)
  const [selectedCategory, setSelectedCategory] = useState('Tüm Kategoriler')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      router.push('/')
      return
    }
    loadData()
  }, [userId])

  async function loadData() {
    try {
      const [itemsRes, userRes] = await Promise.all([
        fetch('/api/shop/items'),
        fetch(`/api/user/${userId}`)
      ])

      const itemsData = await itemsRes.json()
      const userData = await userRes.json()

      setItems(itemsData.items || [])
      setUserData(userData)
    } catch (error) {
      console.error('Error loading shop data:', error)
      toast.error('Veriler yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  async function purchaseItem(itemId: string, price: number) {
    if (!userData || userData.points < price) {
      toast.error('Yetersiz puan!')
      return
    }

    try {
      const response = await fetch('/api/shop/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, itemId })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Satın alma başarılı! 🎉')
        loadData() // Verileri yenile
      } else {
        toast.error(data.error || 'Satın alma başarısız')
      }
    } catch (error) {
      console.error('Purchase error:', error)
      toast.error('Bir hata oluştu')
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
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-600 p-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                Mağaza
              </h1>
            </div>
            <div className="text-right bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1">
              <div className="flex items-center gap-1">
                <Coins className="w-4 h-4 text-yellow-300" />
                <span className="text-lg font-bold text-white">{userData?.points || 0}</span>
              </div>
            </div>
          </div>

          {/* Categories */}
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
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-2xl mx-auto px-4 py-6">
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
                    onClick={() => purchaseItem(item.id, item.price)}
                    disabled={userData ? userData.points < item.price : true}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    size="sm"
                  >
                    {userData && userData.points >= item.price ? (
                      <>
                        <Heart className="w-4 h-4 mr-1" />
                        Al
                      </>
                    ) : (
                      'Yetersiz Puan'
                    )}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <BottomNav userId={userId!} />
    </div>
  )
}

export default function ShopPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <ShopContent />
    </Suspense>
  )
}
