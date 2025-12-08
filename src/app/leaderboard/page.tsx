'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import BottomNav from '@/components/BottomNav'
import { Trophy, Crown, Medal, TrendingUp, Star } from 'lucide-react'

interface LeaderboardUser {
  id: string
  username?: string
  firstName?: string
  points: number
  xp: number
  totalMessages: number
  rank?: {
    name: string
    icon: string
  }
  position: number
}

function LeaderboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const userId = searchParams.get('userId')

  const [pointsLeaderboard, setPointsLeaderboard] = useState<LeaderboardUser[]>([])
  const [xpLeaderboard, setXpLeaderboard] = useState<LeaderboardUser[]>([])
  const [pointsCurrentUser, setPointsCurrentUser] = useState<LeaderboardUser | null>(null)
  const [xpCurrentUser, setXpCurrentUser] = useState<LeaderboardUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('points')

  useEffect(() => {
    if (!userId) {
      router.push('/')
      return
    }
    loadLeaderboards()
  }, [userId])

  async function loadLeaderboards() {
    try {
      const [pointsRes, xpRes] = await Promise.all([
        fetch(`/api/leaderboard?userId=${userId}&sortBy=points`),
        fetch(`/api/leaderboard?userId=${userId}&sortBy=xp`)
      ])

      const pointsData = await pointsRes.json()
      const xpData = await xpRes.json()

      setPointsLeaderboard(pointsData.leaderboard || [])
      setPointsCurrentUser(pointsData.currentUser || null)
      setXpLeaderboard(xpData.leaderboard || [])
      setXpCurrentUser(xpData.currentUser || null)
    } catch (error) {
      console.error('Error loading leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-400" />
      case 2:
        return <Medal className="w-6 h-6 text-gray-300" />
      case 3:
        return <Medal className="w-6 h-6 text-orange-400" />
      default:
        return <span className="text-lg font-bold text-slate-400">#{position}</span>
    }
  }

  const getPositionGradient = (position: number) => {
    switch (position) {
      case 1:
        return 'from-yellow-500/20 to-orange-500/20 border-yellow-500/40'
      case 2:
        return 'from-gray-400/20 to-gray-600/20 border-gray-400/40'
      case 3:
        return 'from-orange-400/20 to-red-500/20 border-orange-400/40'
      default:
        return 'from-slate-700/20 to-slate-800/20 border-slate-600/40'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  const renderLeaderboard = (leaderboard: LeaderboardUser[], currentUser: LeaderboardUser | null, sortBy: 'points' | 'xp') => (
    <>
      {/* Current User Position */}
      {currentUser && (
        <Card className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border-blue-500/40 p-4 mb-4 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-500/30 border-2 border-blue-400/50">
              <span className="text-lg font-bold text-white">#{currentUser.position}</span>
            </div>
            <Avatar className="w-12 h-12 border-2 border-white/30">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white font-bold">
                {currentUser.firstName?.[0] || currentUser.username?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold text-white">Sen</p>
              <p className="text-xs text-white/70">@{currentUser.username || 'kullanici'}</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-yellow-300">
                {sortBy === 'points' ? currentUser.points : currentUser.xp}
              </p>
              <p className="text-xs text-white/70">{sortBy === 'points' ? 'puan' : 'XP'}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Top 3 Podium */}
      {leaderboard.length >= 3 && (
        <div className="grid grid-cols-3 gap-2 mb-6">
          {/* 2nd Place */}
          <div className="flex flex-col items-center order-1">
            <div className="relative mb-2">
              <Avatar className="w-16 h-16 border-2 border-gray-400">
                <AvatarFallback className="bg-gradient-to-br from-gray-400 to-gray-600 text-white font-bold text-lg">
                  {leaderboard[1].firstName?.[0] || leaderboard[1].username?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -top-2 -right-2 bg-gray-400 rounded-full w-7 h-7 flex items-center justify-center border-2 border-slate-900">
                <span className="text-xs font-bold text-white">2</span>
              </div>
            </div>
            <Card className="bg-gradient-to-b from-gray-400/20 to-gray-600/20 border-gray-400/40 p-3 w-full text-center h-24">
              <p className="text-sm font-semibold text-white truncate mb-1">
                {leaderboard[1].firstName || leaderboard[1].username || 'User'}
              </p>
              <p className="text-lg font-bold text-yellow-300">
                {sortBy === 'points' ? leaderboard[1].points : leaderboard[1].xp}
              </p>
              <p className="text-xs text-slate-400">{sortBy === 'points' ? 'puan' : 'XP'}</p>
            </Card>
          </div>

          {/* 1st Place */}
          <div className="flex flex-col items-center order-2">
            <Crown className="w-8 h-8 text-yellow-400 mb-1 animate-pulse" />
            <div className="relative mb-2">
              <Avatar className="w-20 h-20 border-3 border-yellow-400 shadow-lg shadow-yellow-400/50">
                <AvatarFallback className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white font-bold text-xl">
                  {leaderboard[0].firstName?.[0] || leaderboard[0].username?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -top-2 -right-2 bg-yellow-400 rounded-full w-8 h-8 flex items-center justify-center border-2 border-slate-900">
                <span className="text-sm font-bold text-slate-900">1</span>
              </div>
            </div>
            <Card className="bg-gradient-to-b from-yellow-500/20 to-orange-500/20 border-yellow-400/40 p-3 w-full text-center h-32">
              <p className="text-sm font-semibold text-white truncate mb-1">
                {leaderboard[0].firstName || leaderboard[0].username || 'User'}
              </p>
              <p className="text-2xl font-bold text-yellow-300">
                {sortBy === 'points' ? leaderboard[0].points : leaderboard[0].xp}
              </p>
              <p className="text-xs text-slate-400">{sortBy === 'points' ? 'puan' : 'XP'}</p>
            </Card>
          </div>

          {/* 3rd Place */}
          <div className="flex flex-col items-center order-3">
            <div className="relative mb-2">
              <Avatar className="w-16 h-16 border-2 border-orange-400">
                <AvatarFallback className="bg-gradient-to-br from-orange-400 to-red-500 text-white font-bold text-lg">
                  {leaderboard[2].firstName?.[0] || leaderboard[2].username?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -top-2 -right-2 bg-orange-400 rounded-full w-7 h-7 flex items-center justify-center border-2 border-slate-900">
                <span className="text-xs font-bold text-white">3</span>
              </div>
            </div>
            <Card className="bg-gradient-to-b from-orange-400/20 to-red-500/20 border-orange-400/40 p-3 w-full text-center h-24">
              <p className="text-sm font-semibold text-white truncate mb-1">
                {leaderboard[2].firstName || leaderboard[2].username || 'User'}
              </p>
              <p className="text-lg font-bold text-yellow-300">
                {sortBy === 'points' ? leaderboard[2].points : leaderboard[2].xp}
              </p>
              <p className="text-xs text-slate-400">{sortBy === 'points' ? 'puan' : 'XP'}</p>
            </Card>
          </div>
        </div>
      )}

      {/* Rest of Leaderboard */}
      <div className="space-y-2">
        {leaderboard.slice(3).map((user) => (
          <Card
            key={user.id}
            className={`bg-gradient-to-r ${getPositionGradient(user.position)} p-4 hover:scale-[1.02] transition-transform`}
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 flex items-center justify-center">
                {getPositionIcon(user.position)}
              </div>
              <Avatar className="w-12 h-12 border-2 border-white/20">
                <AvatarFallback className="bg-gradient-to-br from-slate-600 to-slate-800 text-white font-bold">
                  {user.firstName?.[0] || user.username?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-semibold text-white">
                  {user.firstName || user.username || 'Kullanıcı'}
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>{user.totalMessages} mesaj</span>
                  <span>•</span>
                  <span>{sortBy === 'points' ? `${user.xp} XP` : `${user.points} puan`}</span>
                </div>
              </div>
              {user.rank && (
                <span className="text-xl">{user.rank.icon}</span>
              )}
              <div className="text-right">
                <p className="text-xl font-bold text-yellow-300">
                  {sortBy === 'points' ? user.points : user.xp}
                </p>
                <p className="text-xs text-slate-400">{sortBy === 'points' ? 'puan' : 'XP'}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {leaderboard.length === 0 && (
        <Card className="bg-slate-800/50 border-slate-700 p-12 text-center">
          <Trophy className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 text-lg">Henüz sıralama oluşturulmamış</p>
        </Card>
      )}
    </>
  )

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-amber-600 to-orange-600 p-4">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-xl font-bold text-white flex items-center justify-center gap-2">
            <Trophy className="w-5 h-5" />
            Liderlik Sıralaması
          </h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Tabs */}
        <Tabs defaultValue="points" className="w-full mb-4">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="points" className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Puanlar
            </TabsTrigger>
            <TabsTrigger value="xp" className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              XP
            </TabsTrigger>
          </TabsList>

          <TabsContent value="points">
            {renderLeaderboard(pointsLeaderboard, pointsCurrentUser, 'points')}
          </TabsContent>

          <TabsContent value="xp">
            {renderLeaderboard(xpLeaderboard, xpCurrentUser, 'xp')}
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav userId={userId!} />
    </div>
  )
}

export default function LeaderboardPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <LeaderboardContent />
    </Suspense>
  )
}
