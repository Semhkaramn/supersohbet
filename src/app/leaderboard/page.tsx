'use client'

import { useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthState, useModals } from '@/lib/auth-context'
import { useLeaderboard } from '@/lib/hooks/useLeaderboard'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import DashboardLayout from '@/components/DashboardLayout'
import { Trophy, Crown, Medal, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface LeaderboardUser {
  id: string
  siteUsername?: string
  username?: string
  firstName?: string
  photoUrl?: string
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
  const { user } = useAuthState()
  const { setShowLoginModal } = useModals()
  const [activeTab, setActiveTab] = useState('points')

  // ✅ OPTIMIZASYON: React Query hooks - Her tab için ayrı hook
  const {
    data: pointsData,
    isLoading: loadingPoints
  } = useLeaderboard('points', user?.id)

  const {
    data: xpData,
    isLoading: loadingXp
  } = useLeaderboard('xp', user?.id)

  const loading = loadingPoints || loadingXp

  // ✅ OPTIMIZASYON: Data destructuring
  const pointsLeaderboard = pointsData?.leaderboard || []
  const pointsCurrentUser = pointsData?.currentUser || null
  const xpLeaderboard = xpData?.leaderboard || []
  const xpCurrentUser = xpData?.currentUser || null

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
      {currentUser && (
        <Card className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border-blue-500/40 p-4 mb-4 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-500/30 border-2 border-blue-400/50">
              <span className="text-lg font-bold text-white">#{currentUser.position}</span>
            </div>
            <Avatar className="w-12 h-12 border-2 border-white/30">
              {currentUser.photoUrl && <AvatarImage src={currentUser.photoUrl} alt={currentUser.siteUsername || currentUser.firstName || currentUser.username || 'User'} />}
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white font-bold">
                {currentUser.siteUsername?.[0] || currentUser.firstName?.[0] || currentUser.username?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-bold text-white text-lg">Sen - {currentUser.siteUsername || 'Kullanıcı'}</p>
              <div className="flex flex-col text-xs text-white/60">
                {currentUser.firstName && <span>{currentUser.firstName}</span>}
                {currentUser.username && <span>@{currentUser.username}</span>}
              </div>
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

      {leaderboard.length >= 3 && (
        <div className="grid grid-cols-3 gap-2 mb-6">
          <div className="flex flex-col items-center order-1">
            <div className="relative mb-2">
              <Avatar className="w-16 h-16 border-2 border-gray-400">
                {leaderboard[1].photoUrl && <AvatarImage src={leaderboard[1].photoUrl} alt={leaderboard[1].siteUsername || leaderboard[1].firstName || leaderboard[1].username || 'User'} />}
                <AvatarFallback className="bg-gradient-to-br from-gray-400 to-gray-600 text-white font-bold text-lg">
                  {leaderboard[1].siteUsername?.[0] || leaderboard[1].firstName?.[0] || leaderboard[1].username?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -top-2 -right-2 bg-gray-400 rounded-full w-7 h-7 flex items-center justify-center border-2 border-slate-900">
                <span className="text-xs font-bold text-white">2</span>
              </div>
            </div>
            <Card className="bg-gradient-to-b from-gray-400/20 to-gray-600/20 border-gray-400/40 p-3 w-full text-center h-28">
              <p className="text-sm font-bold text-white truncate mb-0.5">
                {leaderboard[1].siteUsername || 'Kullanıcı'}
              </p>
              <div className="flex flex-col text-[10px] text-white/50 mb-1">
                {leaderboard[1].firstName && <span className="truncate">{leaderboard[1].firstName}</span>}
                {leaderboard[1].username && <span className="truncate">@{leaderboard[1].username}</span>}
              </div>
              <p className="text-lg font-bold text-yellow-300">
                {sortBy === 'points' ? leaderboard[1].points : leaderboard[1].xp}
              </p>
              <p className="text-xs text-slate-400">{sortBy === 'points' ? 'puan' : 'XP'}</p>
            </Card>
          </div>

          <div className="flex flex-col items-center order-2">
            <Crown className="w-8 h-8 text-yellow-400 mb-1 animate-pulse" />
            <div className="relative mb-2">
              <Avatar className="w-20 h-20 border-3 border-yellow-400 shadow-lg shadow-yellow-400/50">
                {leaderboard[0].photoUrl && <AvatarImage src={leaderboard[0].photoUrl} alt={leaderboard[0].siteUsername || leaderboard[0].firstName || leaderboard[0].username || 'User'} />}
                <AvatarFallback className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white font-bold text-xl">
                  {leaderboard[0].siteUsername?.[0] || leaderboard[0].firstName?.[0] || leaderboard[0].username?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -top-2 -right-2 bg-yellow-400 rounded-full w-8 h-8 flex items-center justify-center border-2 border-slate-900">
                <span className="text-sm font-bold text-slate-900">1</span>
              </div>
            </div>
            <Card className="bg-gradient-to-b from-yellow-500/20 to-orange-500/20 border-yellow-400/40 p-3 w-full text-center h-36">
              <p className="text-base font-bold text-white truncate mb-0.5">
                {leaderboard[0].siteUsername || 'Kullanıcı'}
              </p>
              <div className="flex flex-col text-[10px] text-white/50 mb-1">
                {leaderboard[0].firstName && <span className="truncate">{leaderboard[0].firstName}</span>}
                {leaderboard[0].username && <span className="truncate">@{leaderboard[0].username}</span>}
              </div>
              <p className="text-2xl font-bold text-yellow-300">
                {sortBy === 'points' ? leaderboard[0].points : leaderboard[0].xp}
              </p>
              <p className="text-xs text-slate-400">{sortBy === 'points' ? 'puan' : 'XP'}</p>
            </Card>
          </div>

          <div className="flex flex-col items-center order-3">
            <div className="relative mb-2">
              <Avatar className="w-16 h-16 border-2 border-orange-400">
                {leaderboard[2].photoUrl && <AvatarImage src={leaderboard[2].photoUrl} alt={leaderboard[2].siteUsername || leaderboard[2].firstName || leaderboard[2].username || 'User'} />}
                <AvatarFallback className="bg-gradient-to-br from-orange-400 to-red-500 text-white font-bold text-lg">
                  {leaderboard[2].siteUsername?.[0] || leaderboard[2].firstName?.[0] || leaderboard[2].username?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -top-2 -right-2 bg-orange-400 rounded-full w-7 h-7 flex items-center justify-center border-2 border-slate-900">
                <span className="text-xs font-bold text-white">3</span>
              </div>
            </div>
            <Card className="bg-gradient-to-b from-orange-400/20 to-red-500/20 border-orange-400/40 p-3 w-full text-center h-28">
              <p className="text-sm font-bold text-white truncate mb-0.5">
                {leaderboard[2].siteUsername || 'Kullanıcı'}
              </p>
              <div className="flex flex-col text-[10px] text-white/50 mb-1">
                {leaderboard[2].firstName && <span className="truncate">{leaderboard[2].firstName}</span>}
                {leaderboard[2].username && <span className="truncate">@{leaderboard[2].username}</span>}
              </div>
              <p className="text-lg font-bold text-yellow-300">
                {sortBy === 'points' ? leaderboard[2].points : leaderboard[2].xp}
              </p>
              <p className="text-xs text-slate-400">{sortBy === 'points' ? 'puan' : 'XP'}</p>
            </Card>
          </div>
        </div>
      )}

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
                {user.photoUrl && <AvatarImage src={user.photoUrl} alt={user.siteUsername || user.firstName || user.username || 'User'} />}
                <AvatarFallback className="bg-gradient-to-br from-slate-600 to-slate-800 text-white font-bold">
                  {user.siteUsername?.[0] || user.firstName?.[0] || user.username?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-bold text-white text-base">
                  {user.siteUsername || 'Kullanıcı'}
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <div className="flex flex-col">
                    {user.firstName && <span className="text-slate-400">{user.firstName}</span>}
                    {user.username && <span className="text-slate-500">@{user.username}</span>}
                  </div>
                  <span>•</span>
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
    <div className="max-w-4xl mx-auto space-y-6 py-6">
      {/* Giriş yapmamış kullanıcılar için bilgilendirme */}
      {!user && (
        <Card className="bg-gradient-to-br from-blue-900/40 via-indigo-900/30 to-blue-900/40 border-blue-500/50 p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Trophy className="w-5 h-5 text-blue-300" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-blue-100 mb-1">Sıralamada Yerinizi Görmek İçin Giriş Yapın</p>
              <p className="text-sm text-blue-200/80">
                Liderlik tablosunu görüntüleyebilirsiniz. Kendi sıralamanızı görmek için giriş yapın.
              </p>
              <Button
                onClick={() => setShowLoginModal(true)}
                size="sm"
                className="mt-3 bg-blue-500 hover:bg-blue-400 text-white font-bold"
              >
                Giriş Yap
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Tabs defaultValue="points" className="w-full">
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
  )
}

export default function LeaderboardPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }>
        <LeaderboardContent />
      </Suspense>
    </DashboardLayout>
  )
}
