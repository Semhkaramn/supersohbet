'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import BottomNav from '@/components/BottomNav'
import { Trophy, Star, ShoppingBag, TrendingUp } from 'lucide-react'

interface UserData {
  id: string
  telegramId: string
  username?: string
  firstName?: string
  lastName?: string
  points: number
  xp: number
  totalMessages: number
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
}

export default function DashboardPage() {
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

  const xpProgress = userData.nextRank
    ? ((userData.xp - (userData.rank?.minXp || 0)) / (userData.nextRank.minXp - (userData.rank?.minXp || 0))) * 100
    : 100

  return (
    <div className="min-h-screen pb-24">
      {/* Header / Profile Card */}
      <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 p-6 pb-12">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="w-16 h-16 border-4 border-white/20">
              <AvatarFallback className="bg-white/10 text-white text-xl font-bold">
                {userData.firstName?.[0] || userData.username?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">
                {userData.firstName || userData.username || 'Ejderiya avcısı'}
              </h1>
              <p className="text-white/70 text-sm">@{userData.username || 'kullanici'}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-yellow-300">{userData.points}</div>
              <p className="text-white/70 text-xs">Puan</p>
            </div>
          </div>

          {/* Rank Progress */}
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{userData.rank?.icon || '⭐'}</span>
                <div>
                  <p className="text-white font-semibold">{userData.rank?.name || 'Seviye 1'}</p>
                  <p className="text-white/70 text-xs">
                    {userData.nextRank
                      ? `Sonraki seviye için ${userData.nextRank.minXp - userData.xp} XP gerekli`
                      : 'Maksimum seviye!'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white font-bold">{userData.xp} XP</p>
              </div>
            </div>
            <Progress value={xpProgress} className="h-2 bg-white/20" />
          </Card>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="max-w-2xl mx-auto px-4 -mt-6">
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Card className="bg-white/5 backdrop-blur-sm border-white/10 p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{userData.totalMessages}</p>
                <p className="text-gray-400 text-sm">Toplam Sipariş</p>
              </div>
            </div>
          </Card>

          <Card className="bg-white/5 backdrop-blur-sm border-white/10 p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">1</p>
                <p className="text-gray-400 text-sm">Liderlik Sırası</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Daily Spin Info */}
        {userData.dailySpinsLeft > 0 && (
          <Card className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/30 p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-purple-500/30 flex items-center justify-center">
                  <Star className="w-6 h-6 text-purple-300" />
                </div>
                <div>
                  <p className="text-white font-semibold">Günlük Şans Çarkı</p>
                  <p className="text-white/70 text-sm">{userData.dailySpinsLeft} çevirme hakkın var!</p>
                </div>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-300" />
            </div>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Card
            onClick={() => router.push(`/shop?userId=${userId}`)}
            className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-emerald-500/30 p-6 cursor-pointer hover:scale-105 transition-transform"
          >
            <ShoppingBag className="w-8 h-8 text-emerald-400 mb-2" />
            <p className="font-semibold text-white">Mağaza</p>
            <p className="text-sm text-white/70">Ödüllere göz at</p>
          </Card>

          <Card
            onClick={() => router.push(`/wheel?userId=${userId}`)}
            className="bg-gradient-to-br from-orange-500/20 to-red-500/20 border-orange-500/30 p-6 cursor-pointer hover:scale-105 transition-transform"
          >
            <Trophy className="w-8 h-8 text-orange-400 mb-2" />
            <p className="font-semibold text-white">Şans Çarkı</p>
            <p className="text-sm text-white/70">Hemen çevir!</p>
          </Card>
        </div>
      </div>

      <BottomNav userId={userId!} />
    </div>
  )
}
