'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import DashboardLayout from '@/components/DashboardLayout'
import ProtectedRoute from '@/components/ProtectedRoute'
import {
  Trophy, Star, MessageSquare, TrendingUp, ShoppingBag, Clock,
  CheckCircle2, Package, Users, History, Crown, Wallet,
  ArrowRight, Link as LinkIcon, Gift
} from 'lucide-react'

interface PointHistory {
  id: string
  amount: number
  type: string
  description: string
  adminUsername?: string
  createdAt: string
}

interface Rank {
  id: string
  name: string
  icon: string
  color: string
  minXp: number
  order: number
}

interface UserData {
  id: string
  telegramId?: string
  email?: string
  username?: string
  firstName?: string
  lastName?: string
  photoUrl?: string
  points: number
  xp: number
  totalMessages: number
  totalReferrals: number
  referralPoints: number
  pointHistory?: PointHistory[]
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
  allRanks?: Rank[]
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

function ProfileContent() {
  const router = useRouter()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [userRes, purchasesRes] = await Promise.all([
        fetch('/api/user/me'),
        fetch('/api/user/me/purchases')
      ])

      const userData = await userRes.json()
      const purchasesData = await purchasesRes.json()

      setUserData(userData)
      setPurchases(purchasesData.purchases || [])
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
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-400">Kullanıcı bulunamadı</p>
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
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Hero Profile Card */}
      <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 p-6">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <Avatar className="w-24 h-24 border-4 border-white/20 shadow-xl">
            {userData.photoUrl && <AvatarImage src={userData.photoUrl} alt={userData.firstName || userData.username || 'User'} />}
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-3xl font-bold">
              {userData.firstName?.[0] || userData.username?.[0] || '?'}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 text-center md:text-left">
            <h2 className="text-3xl font-bold text-white mb-1">
              {userData.firstName || userData.username || 'Kullanıcı'}
            </h2>
            <p className="text-white/70 mb-3">@{userData.username || 'kullanici'}</p>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              {userData.rank && (
                <Badge className="text-sm font-semibold" style={{ backgroundColor: userData.rank.color }}>
                  {userData.rank.icon} {userData.rank.name}
                </Badge>
              )}
              {userData.leaderboardRank && userData.leaderboardRank <= 10 && (
                <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
                  <Crown className="w-4 h-4 mr-1" />
                  #{userData.leaderboardRank} Sırada
                </Badge>
              )}
              <Badge variant="outline" className="border-white/30 text-white/70">
                <Clock className="w-4 h-4 mr-1" />
                {new Date(userData.createdAt).toLocaleDateString('tr-TR')}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-4 text-center">
              <Star className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
              <div className="text-2xl font-bold text-white">{userData.points}</div>
              <p className="text-white/60 text-xs">Puan</p>
            </Card>
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-4 text-center">
              <TrendingUp className="w-5 h-5 text-purple-400 mx-auto mb-1" />
              <div className="text-2xl font-bold text-white">{userData.xp}</div>
              <p className="text-white/60 text-xs">XP</p>
            </Card>
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-4 text-center">
              <MessageSquare className="w-5 h-5 text-blue-400 mx-auto mb-1" />
              <div className="text-2xl font-bold text-white">{userData.totalMessages}</div>
              <p className="text-white/60 text-xs">Mesaj</p>
            </Card>
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-4 text-center">
              <Users className="w-5 h-5 text-green-400 mx-auto mb-1" />
              <div className="text-2xl font-bold text-white">{userData.totalReferrals || 0}</div>
              <p className="text-white/60 text-xs">Davet</p>
            </Card>
          </div>
        </div>
      </Card>

      {/* Telegram Status */}
      {!userData.telegramId ? (
        <Card className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border-blue-500/30 p-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-500/30 flex items-center justify-center flex-shrink-0">
              <LinkIcon className="w-6 h-6 text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold text-lg mb-1">Telegram Hesabını Bağla</h3>
              <p className="text-white/70 text-sm mb-3">WebApp'ten otomatik giriş yapabilirsin</p>
              <Button className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white">
                <LinkIcon className="w-4 h-4 mr-2" />
                Bağla
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 border-green-500/30 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-green-500/30 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Telegram Bağlı</h3>
              <p className="text-white/70 text-sm">WebApp'ten otomatik giriş yapabiliyorsun</p>
            </div>
          </div>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card
          className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 border-green-500/30 p-5 cursor-pointer hover:from-green-600/30 hover:to-emerald-600/30 transition-all group"
          onClick={() => router.push('/wallet-info')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-green-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Wallet className="w-7 h-7 text-green-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Cüzdan & Sponsor</h3>
                <p className="text-white/70 text-sm">Ödeme bilgilerini yönet</p>
              </div>
            </div>
            <ArrowRight className="w-6 h-6 text-green-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </Card>

        <Card
          className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 border-purple-500/30 p-5 cursor-pointer hover:from-purple-600/30 hover:to-pink-600/30 transition-all group"
          onClick={() => router.push('/referral')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-purple-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Gift className="w-7 h-7 text-purple-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Referans Sistemi</h3>
                <p className="text-white/70 text-sm">{userData.totalReferrals} davet, {userData.referralPoints} puan</p>
              </div>
            </div>
            <ArrowRight className="w-6 h-6 text-purple-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </Card>
      </div>

      {/* Rank Progress Card */}
      <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/50 flex items-center justify-center">
              <span className="text-5xl">{userData.rank?.icon || '⭐'}</span>
            </div>
            <div>
              <p className="text-white font-bold text-2xl">{userData.rank?.name || 'Seviye 1'}</p>
              <p className="text-slate-400 text-sm mt-1">
                {userData.nextRank ? `${userData.nextRank.minXp - userData.xp} XP kaldı` : 'Maksimum seviye!'}
              </p>
            </div>
          </div>
          {userData.leaderboardRank && (
            <div className="text-center bg-yellow-500/20 px-4 py-3 rounded-xl border border-yellow-500/30">
              <Trophy className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
              <p className="text-yellow-400 font-bold text-lg">#{userData.leaderboardRank}</p>
            </div>
          )}
        </div>

        <div className="mb-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-slate-300 text-sm font-medium">İlerleme</span>
            <span className="text-white font-bold">{userData.xp} / {userData.nextRank?.minXp || userData.xp} XP</span>
          </div>
          <Progress value={xpProgress} className="h-3 bg-slate-700" />
        </div>
      </Card>

      {/* Message Stats */}
      {userData.messageStats && (
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 p-6">
          <h3 className="text-white font-semibold text-xl mb-4 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-blue-400" />
            Mesaj İstatistiklerim
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-cyan-400">{userData.messageStats.daily}</p>
              <p className="text-slate-400 text-sm mt-1">Bugün</p>
            </div>
            <div className="bg-teal-500/10 border border-teal-500/30 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-teal-400">{userData.messageStats.weekly}</p>
              <p className="text-slate-400 text-sm mt-1">Bu Hafta</p>
            </div>
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-green-400">{userData.messageStats.monthly}</p>
              <p className="text-slate-400 text-sm mt-1">Bu Ay</p>
            </div>
            <div className="bg-lime-500/10 border border-lime-500/30 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-lime-400">{userData.messageStats.total}</p>
              <p className="text-slate-400 text-sm mt-1">Toplam</p>
            </div>
          </div>
        </Card>
      )}

      {/* Referral Stats */}
      <Card className="bg-gradient-to-br from-orange-600/20 to-red-600/20 border-orange-500/30 p-6">
        <h3 className="text-white font-semibold text-xl mb-4 flex items-center gap-2">
          <Users className="w-6 h-6 text-orange-400" />
          Referans İstatistiklerim
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-orange-400">{userData.totalReferrals || 0}</p>
            <p className="text-slate-400 text-sm mt-1">Toplam Davet</p>
          </div>
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-red-400">{userData.referralPoints || 0}</p>
            <p className="text-slate-400 text-sm mt-1">Kazanılan Puan</p>
          </div>
        </div>
      </Card>

      {/* Tabs Section */}
      <Tabs defaultValue="history" className="w-full">
        <TabsList className="w-full grid grid-cols-3 bg-slate-800 border border-slate-700 mb-6">
          <TabsTrigger value="history" className="data-[state=active]:bg-slate-700">
            <History className="w-4 h-4 mr-2" />
            Geçmiş
          </TabsTrigger>
          <TabsTrigger value="purchases" className="data-[state=active]:bg-slate-700">
            <ShoppingBag className="w-4 h-4 mr-2" />
            Alımlar
          </TabsTrigger>
          <TabsTrigger value="ranks" className="data-[state=active]:bg-slate-700">
            <Crown className="w-4 h-4 mr-2" />
            Rütbeler
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-3">
          {!userData.pointHistory || userData.pointHistory.length === 0 ? (
            <Card className="bg-slate-800/50 border-slate-700 p-12 text-center">
              <History className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">Henüz puan geçmişi yok</p>
            </Card>
          ) : (
            userData.pointHistory.map(history => {
              const isPositive = history.amount > 0
              let iconBg = 'bg-slate-500/20'
              let iconBorder = 'border-slate-500/30'
              let Icon = History
              let iconColor = 'text-slate-400'

              switch(history.type) {
                case 'wheel_win':
                  Icon = Star
                  iconBg = 'bg-purple-500/20'
                  iconBorder = 'border-purple-500/30'
                  iconColor = 'text-purple-400'
                  break
                case 'shop_purchase':
                  Icon = ShoppingBag
                  iconBg = 'bg-red-500/20'
                  iconBorder = 'border-red-500/30'
                  iconColor = 'text-red-400'
                  break
                case 'task_reward':
                  Icon = CheckCircle2
                  iconBg = 'bg-emerald-500/20'
                  iconBorder = 'border-emerald-500/30'
                  iconColor = 'text-emerald-400'
                  break
                case 'admin_add':
                  Icon = TrendingUp
                  iconBg = 'bg-green-500/20'
                  iconBorder = 'border-green-500/30'
                  iconColor = 'text-green-400'
                  break
                case 'referral_reward':
                  Icon = Users
                  iconBg = 'bg-blue-500/20'
                  iconBorder = 'border-blue-500/30'
                  iconColor = 'text-blue-400'
                  break
                case 'message_reward':
                  Icon = MessageSquare
                  iconBg = 'bg-teal-500/20'
                  iconBorder = 'border-teal-500/30'
                  iconColor = 'text-teal-400'
                  break
              }

              return (
                <Card key={history.id} className="bg-slate-800/80 border-slate-700 p-5 hover:bg-slate-800 transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl ${iconBg} flex items-center justify-center border ${iconBorder}`}>
                      <Icon className={`w-7 h-7 ${iconColor}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-white text-lg mb-1">{history.description}</h3>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-slate-400">
                          {new Date(history.createdAt).toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        {history.adminUsername && (
                          <span className="text-blue-400">• {history.adminUsername}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-3xl font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                        {isPositive ? '+' : ''}{history.amount}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">puan</p>
                    </div>
                  </div>
                </Card>
              )
            })
          )}
        </TabsContent>

        <TabsContent value="purchases" className="space-y-3">
          {purchases.length === 0 ? (
            <Card className="bg-slate-800/50 border-slate-700 p-12 text-center">
              <ShoppingBag className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">Henüz satın alım yapılmamış</p>
            </Card>
          ) : (
            purchases.map(purchase => (
              <Card key={purchase.id} className="bg-slate-800/80 border-slate-700 p-5 hover:bg-slate-800 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center border border-emerald-500/30">
                    <ShoppingBag className="w-7 h-7 text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white text-lg mb-1">{purchase.item.name}</h3>
                    <div className="flex items-center gap-3 text-sm">
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

        <TabsContent value="ranks" className="space-y-3">
          {!userData.allRanks || userData.allRanks.length === 0 ? (
            <Card className="bg-slate-800/50 border-slate-700 p-12 text-center">
              <Crown className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">Rütbe bilgisi bulunamadı</p>
            </Card>
          ) : (
            <div className="space-y-3">
              <div className="bg-gradient-to-r from-purple-600/20 to-indigo-600/20 border border-purple-500/30 rounded-xl p-5 mb-4">
                <h3 className="text-white font-bold text-xl mb-2 flex items-center gap-2">
                  <Crown className="w-6 h-6 text-purple-400" />
                  Rütbe Sistemi
                </h3>
                <p className="text-slate-300">
                  Mesaj göndererek XP kazan ve rütbeni yükselt! Toplam {userData.allRanks.length} rütbe mevcut.
                </p>
              </div>

              {userData.allRanks.map((rank) => {
                const isCurrentRank = userData.rank?.minXp === rank.minXp
                const isCompleted = (userData.xp || 0) >= rank.minXp
                const isNextRank = userData.nextRank?.minXp === rank.minXp

                return (
                  <Card
                    key={rank.id}
                    className={`p-5 transition-all ${
                      isCurrentRank
                        ? 'bg-gradient-to-br from-yellow-600/30 to-orange-600/30 border-2 border-yellow-500/50 shadow-lg shadow-yellow-500/20 scale-105'
                        : isCompleted
                        ? 'bg-slate-800/80 border-slate-700'
                        : 'bg-slate-800/50 border-slate-700 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                        isCurrentRank
                          ? 'bg-gradient-to-br from-yellow-500/30 to-orange-500/30 border-2 border-yellow-500/50'
                          : isCompleted
                          ? 'bg-green-500/20 border-2 border-green-500/30'
                          : 'bg-slate-700/50 border-2 border-slate-600'
                      }`}>
                        <span className="text-4xl">{rank.icon}</span>
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={`font-bold text-xl ${
                            isCurrentRank ? 'text-yellow-300' : 'text-white'
                          }`}>
                            {rank.name}
                          </h4>
                          {isCurrentRank && (
                            <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                              Mevcut
                            </Badge>
                          )}
                          {isNextRank && !isCurrentRank && (
                            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                              Sonraki
                            </Badge>
                          )}
                          {isCompleted && !isCurrentRank && !isNextRank && (
                            <CheckCircle2 className="w-5 h-5 text-green-400" />
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <p className="text-slate-400">
                            {rank.minXp.toLocaleString('tr-TR')} XP
                          </p>
                          {isNextRank && (
                            <p className="text-purple-400 text-sm font-medium">
                              • {rank.minXp - (userData.xp || 0)} XP kaldı
                            </p>
                          )}
                        </div>
                      </div>

                      {isCompleted && (
                        <div className="text-right">
                          <div className="w-10 h-10 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                            <CheckCircle2 className="w-6 h-6 text-green-400" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Progress bar for current rank */}
                    {isCurrentRank && userData.nextRank && (
                      <div className="mt-4 pt-4 border-t border-yellow-500/30">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-yellow-300 font-medium">Sonraki seviyeye ilerleme</span>
                          <span className="text-sm text-yellow-400 font-bold">
                            {Math.round(xpProgress)}%
                          </span>
                        </div>
                        <Progress value={xpProgress} className="h-2 bg-slate-700" />
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        }>
          <ProfileContent />
        </Suspense>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
