'use client'

import { useEffect, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Star, TrendingUp } from 'lucide-react'

interface UserData {
  username?: string
  firstName?: string
  photoUrl?: string
  points: number
  xp: number
  rank?: {
    name: string
    icon: string
    color: string
  }
  leaderboardRank?: number
}

export default function Header() {
  const [userData, setUserData] = useState<UserData | null>(null)

  useEffect(() => {
    loadUserData()
  }, [])

  async function loadUserData() {
    try {
      const response = await fetch('/api/user/me')
      if (response.ok) {
        const data = await response.json()
        setUserData(data)
      }
    } catch (error) {
      console.error('Error loading user data:', error)
    }
  }

  if (!userData) {
    return (
      <header className="hidden lg:block sticky top-0 z-40 w-full bg-slate-900/95 backdrop-blur-xl border-b border-white/10">
        <div className="px-6 py-4">
          <div className="w-48 h-8 bg-white/5 animate-pulse rounded-lg"></div>
        </div>
      </header>
    )
  }

  return (
    <header className="hidden lg:block sticky top-0 z-40 w-full bg-slate-900/95 backdrop-blur-xl border-b border-white/10">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="w-12 h-12 border-2 border-white/20">
              <AvatarImage src={userData.photoUrl} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold">
                {userData.firstName?.[0] || userData.username?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-bold text-white">
                {userData.firstName || userData.username || 'Kullanıcı'}
              </h3>
              <div className="flex items-center gap-2">
                {userData.rank && (
                  <Badge
                    className="text-xs font-semibold"
                    style={{ backgroundColor: userData.rank.color }}
                  >
                    {userData.rank.icon} {userData.rank.name}
                  </Badge>
                )}
                {userData.leaderboardRank && userData.leaderboardRank <= 10 && (
                  <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-500">
                    #{userData.leaderboardRank} Sırada
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="flex items-center gap-1 text-yellow-400">
                <Star className="w-4 h-4 fill-yellow-400" />
                <span className="text-lg font-bold">{userData.points.toLocaleString()}</span>
              </div>
              <p className="text-xs text-gray-400">Puan</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-purple-400">
                <TrendingUp className="w-4 h-4" />
                <span className="text-lg font-bold">{userData.xp.toLocaleString()}</span>
              </div>
              <p className="text-xs text-gray-400">XP</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
