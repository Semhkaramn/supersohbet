'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import BottomNav from '@/components/BottomNav'
import { Trophy, Star, MessageSquare, TrendingUp, ShoppingBag, Clock, CheckCircle2, Package } from 'lucide-react'

interface UserData {
  id: string
  telegramId: string
  username?: string
  firstName?: string
  lastName?: string
  points: number
  xp: number
  totalMessages: number
  messageStats?: {
    daily: number
    weekly: number
    monthly: number
    total: number
  }
  rank?: {
    name: string
    icon: string
    color: string
    minXp: number
  }
  nextRank?: {
    name: string
    minXp: number
  }
  dailySpinsLeft: number
  leaderboardRank?: number
  createdAt: string
}

interface Purchase {
  id: string
  item: {
    name: string
    imageUrl?: string
  }
  pointsSpent: number
  status: string
  purchasedAt: string
}

interface WheelSpin {
  id: string
  prize: {
    name: string
  }
  pointsWon: number
  spunAt: string
}

function ProfileContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const userId = searchParams.get('userId')

  const [userData, setUserData] = useState<UserData | null>(null)
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [wheelSpins, setWheelSpins] = useState<WheelSpin[]>([])
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
      const [userRes, purchasesRes] = await Promise.all([
        fetch(`/api/user/${userId}`),
        fetch(`/api/user/${userId}/purchases`)
      ])

      const userData = await userRes.json()
      const purchasesData = await purchasesRes.json()

      setUserData(userData)
      setPurchases(purchasesData.purchases || [])
      setWheelSpins(purchasesData.wheelSpins || [])
    } catch (error) {
      console.error('Error loading profile data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!userData) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <p className="text-red-400">Kullanıcı bulunamadı</p>
        </div>
      </div>
    )
  }

  const xpProgress = userData.nextRank
    ? ((userData.xp - (userData.rank?.minXp || 0)) / (userData.nextRank.minXp - (userData.rank?.minXp || 0))) * 100
    : 100

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Teslim Edildi':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />
      case 'Hazırlanıyor':
        return <Package className="w-4 h-4 text-orange-400" />
      default:
        return <Clock className="w-4 h-4 text-yellow-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Teslim Edildi':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'Hazırlanıyor':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      default:
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    }
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-4">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-xl font-bold text-white flex items-center justify-center gap-2">
            <Trophy className="w-5 h-5" />
            Profilim
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Profile Card */}
        <Card className="bg-white/5 border-white/10 p-4 mb-4">
          <div className="flex flex-col items-center gap-4">
            <Avatar className="w-20 h-20 border-2 border-white/30">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-2xl font-bold">
                {userData.firstName?.[0] || userData.username?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-1">
                {userData.firstName || userData.username || 'Kullanıcı'}
              </h2>
              <p className="text-white/60">@{userData.username || 'kullanici'}</p>
              <p className="text-white/40 text-xs mt-1">
                Üyelik: {new Date(userData.createdAt).toLocaleDateString('tr-TR')}
              </p>
            </div>
          </div>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Card className="bg-white/5 border-white/10 p-3 text-center">
            <div className="text-xl font-bold text-yellow-300">{userData.points}</div>
            <p className="text-white/60 text-xs">Puan</p>
          </Card>
          <Card className="bg-white/5 border-white/10 p-3 text-center">
            <div className="text-xl font-bold text-green-300">{userData.xp}</div>
            <p className="text-white/60 text-xs">XP</p>
          </Card>
          <Card className="bg-white/5 border-white/10 p-3 text-center">
            <div className="text-xl font-bold text-blue-300">{userData.totalMessages}</div>
            <p className="text-white/60 text-xs">Mesaj</p>
          </Card>
        </div>

        {/* Rank Card */}
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 p-5 mb-4 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{userData.rank?.icon || '⭐'}</span>
              <div>
                <p className="text-white font-bold text-lg">{userData.rank?.name || 'Seviye 1'}</p>
                <p className="text-slate-400 text-xs">
                  {userData.nextRank
                    ? `${userData.nextRank.minXp - userData.xp} XP kaldı`
                    : 'Maksimum seviye!'}
                </p>
              </div>
            </div>
            {userData.leaderboardRank && (
              <div className="text-center bg-yellow-500/20 px-3 py-2 rounded-lg border border-yellow-500/30">
                <Trophy className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                <p className="text-yellow-400 font-bold text-sm">#{userData.leaderboardRank}</p>
              </div>
            )}
          </div>
          <Progress value={xpProgress} className="h-2 bg-slate-700" />
        </Card>

        {/* Mesaj İstatistikleri */}
        {userData.messageStats && (
          <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 p-4 mb-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Mesaj İstatistiklerim
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-cyan-400">{userData.messageStats.daily}</p>
                <p className="text-slate-400 text-xs">Bugün</p>
              </div>
              <div className="bg-teal-500/10 border border-teal-500/30 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-teal-400">{userData.messageStats.weekly}</p>
                <p className="text-slate-400 text-xs">Bu Hafta</p>
              </div>
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-400">{userData.messageStats.monthly}</p>
                <p className="text-slate-400 text-xs">Bu Ay</p>
              </div>
              <div className="bg-lime-500/10 border border-lime-500/30 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-lime-400">{userData.messageStats.total}</p>
                <p className="text-slate-400 text-xs">Toplam</p>
              </div>
            </div>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="purchases" className="w-full">
          <TabsList className="w-full grid grid-cols-2 bg-slate-800 border border-slate-700">
            <TabsTrigger value="purchases" className="data-[state=active]:bg-slate-700">
              <ShoppingBag className="w-4 h-4 mr-2" />
              Satın Alımlar
            </TabsTrigger>
            <TabsTrigger value="wheel" className="data-[state=active]:bg-slate-700">
              <Star className="w-4 h-4 mr-2" />
              Çark Geçmişi
            </TabsTrigger>
          </TabsList>

          <TabsContent value="purchases" className="mt-4 space-y-3">
            {purchases.length === 0 ? (
              <Card className="bg-slate-800/50 border-slate-700 p-8 text-center">
                <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">Henüz satın alım yapılmamış</p>
              </Card>
            ) : (
              purchases.map(purchase => (
                <Card key={purchase.id} className="bg-slate-800/80 border-slate-700 p-4 hover:bg-slate-800 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center border border-emerald-500/30">
                      <ShoppingBag className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-1">{purchase.item.name}</h3>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-400">
                          {new Date(purchase.purchasedAt).toLocaleDateString('tr-TR')}
                        </span>
                        <span className="text-yellow-400 font-semibold">
                          • {purchase.pointsSpent} puan
                        </span>
                      </div>
                    </div>
                    <Badge className={`${getStatusColor(purchase.status)} flex items-center gap-1`}>
                      {getStatusIcon(purchase.status)}
                      {purchase.status}
                    </Badge>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="wheel" className="mt-4 space-y-3">
            {wheelSpins.length === 0 ? (
              <Card className="bg-slate-800/50 border-slate-700 p-8 text-center">
                <Star className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">Henüz çark çevrilmemiş</p>
              </Card>
            ) : (
              wheelSpins.map(spin => (
                <Card key={spin.id} className="bg-slate-800/80 border-slate-700 p-4 hover:bg-slate-800 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center border border-purple-500/30">
                      <Star className="w-6 h-6 text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-1">{spin.prize.name}</h3>
                      <p className="text-xs text-slate-400">
                        {new Date(spin.spunAt).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-yellow-400">+{spin.pointsWon}</p>
                      <p className="text-xs text-slate-400">puan</p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav userId={userId!} />
    </div>
  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <ProfileContent />
    </Suspense>
  )
}
