'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import BottomNav from '@/components/BottomNav'
import { BannedScreen } from '@/components/BannedScreen'
import { Trophy, Star, ShoppingBag, TrendingUp, Ticket } from 'lucide-react'

interface UserData {
  id: string
  telegramId: string
  username?: string
  firstName?: string
  lastName?: string
  photoUrl?: string
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
  banned?: boolean
  banReason?: string
  bannedAt?: Date | string
  bannedBy?: string
}

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const userId = searchParams.get('userId')

  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      router.push('/')
      return
    }
    loadUserData()
  }, [userId])

  async function loadUserData() {
    try {
      const response = await fetch(`/api/user/${userId}`)
      const data = await response.json()
      setUserData(data)
    } catch (error) {
      console.error('Error loading user data:', error)
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

  // Ban kontrolü - Banlı kullanıcılar özel ekran görür
  if (userData.banned) {
    return (
      <BannedScreen
        banReason={userData.banReason}
        bannedAt={userData.bannedAt}
        bannedBy={userData.bannedBy}
      />
    )
  }

  const xpProgress = userData.nextRank
    ? ((userData.xp - (userData.rank?.minXp || 0)) / (userData.nextRank.minXp - (userData.rank?.minXp || 0))) * 100
    : 100

  return (
    <div className="min-h-screen pb-24 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-6 shadow-xl">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
            <Trophy className="w-6 h-6" />
            Ana Sayfa
          </h1>
          <p className="text-blue-100 text-sm mt-1">Hoş geldin!</p>
        </div>
      </div>

      {/* User Info & Stats */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* User Card */}
        <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-white/10 p-5 mb-4 shadow-lg">
          <div className="flex items-center gap-4">
            <Avatar
              className="w-20 h-20 border-3 border-white/20 cursor-pointer shadow-xl hover:scale-105 transition-transform"
              onClick={() => router.push(`/profile?userId=${userId}`)}
            >
              {userData.photoUrl && <AvatarImage src={userData.photoUrl} alt={userData.firstName || userData.username || 'User'} />}
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-2xl font-bold">
                {userData.firstName?.[0] || userData.username?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white">
                {userData.firstName || userData.username || 'Kullanıcı'}
              </h2>
              <p className="text-white/60 text-sm">@{userData.username || 'kullanici'}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold bg-gradient-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent">{userData.points}</div>
              <p className="text-white/60 text-xs font-medium">Puan</p>
            </div>
          </div>
        </Card>

        {/* Rank Progress */}
        <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-white/10 p-5 mb-6 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{userData.rank?.icon || '⭐'}</span>
              <div>
                <p className="text-white font-bold text-lg">{userData.rank?.name || 'Seviye 1'}</p>
                <p className="text-white/70 text-xs">
                  {userData.nextRank
                    ? `Sonraki seviye için ${userData.nextRank.minXp - userData.xp} XP gerekli`
                    : 'Maksimum seviye!'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-white font-bold text-xl">{userData.xp} XP</p>
            </div>
          </div>
          <Progress value={xpProgress} className="h-3 bg-white/20 shadow-inner" />
        </Card>

        {/* Daily Spin Alert - More Prominent */}
        {userData.dailySpinsLeft > 0 && (
          <Card className="bg-gradient-to-br from-purple-600/30 via-pink-600/30 to-purple-700/30 border-2 border-purple-400/50 p-5 mb-6 shadow-xl hover:scale-[1.02] transition-transform cursor-pointer animate-pulse-subtle" onClick={() => router.push(`/wheel?userId=${userId}`)}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg animate-spin-slow">
                  <Ticket className="w-8 h-8 text-white" />
                </div>
                <div>
                  <p className="text-white font-bold text-lg">🎉 Günlük Şans Çarkı!</p>
                  <p className="text-purple-100 text-sm font-medium">
                    {userData.dailySpinsLeft} çevirme hakkın var - Hemen çevir!
                  </p>
                </div>
              </div>
              <TrendingUp className="w-10 h-10 text-purple-300 animate-bounce" />
            </div>
          </Card>
        )}
      </div>

      {/* Stats Grid */}
      <div className="max-w-2xl mx-auto px-4">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-500/20 to-indigo-500/20 backdrop-blur-sm border-blue-500/30 p-5 shadow-lg hover:scale-105 transition-transform">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-blue-500/30 flex items-center justify-center shadow-inner">
                <ShoppingBag className="w-7 h-7 text-blue-300" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{userData.messageStats?.total || 0}</p>
                <p className="text-gray-300 text-sm font-medium">Toplam Mesaj</p>
              </div>
            </div>
          </Card>

          <Card
            className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 backdrop-blur-sm border-yellow-500/30 p-5 cursor-pointer hover:scale-105 transition-transform shadow-lg"
            onClick={() => router.push(`/leaderboard?userId=${userId}`)}
          >
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-yellow-500/30 flex items-center justify-center shadow-inner">
                <Trophy className="w-7 h-7 text-yellow-300" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{userData.leaderboardRank || '-'}</p>
                <p className="text-gray-300 text-sm font-medium">Liderlik Sırası</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Card
            onClick={() => router.push(`/shop?userId=${userId}`)}
            className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-emerald-500/30 p-6 cursor-pointer hover:scale-105 transition-all shadow-lg"
          >
            <ShoppingBag className="w-10 h-10 text-emerald-300 mb-3" />
            <p className="font-bold text-white text-lg">Mağaza</p>
            <p className="text-sm text-emerald-100/80 mt-1">Ödüllere göz at</p>
          </Card>

          <Card
            onClick={() => router.push(`/wheel?userId=${userId}`)}
            className="bg-gradient-to-br from-orange-500/20 to-red-500/20 border-orange-500/30 p-6 cursor-pointer hover:scale-105 transition-all shadow-lg relative overflow-hidden"
          >
            {userData.dailySpinsLeft > 0 && (
              <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                {userData.dailySpinsLeft}
              </div>
            )}
            <Trophy className="w-10 h-10 text-orange-300 mb-3" />
            <p className="font-bold text-white text-lg">Şans Çarkı</p>
            <p className="text-sm text-orange-100/80 mt-1">Hemen çevir!</p>
          </Card>
        </div>
      </div>

      <BottomNav userId={userId!} />

      <style jsx>{`
        @keyframes pulse-subtle {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.95;
          }
        }

        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .animate-pulse-subtle {
          animation: pulse-subtle 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}
