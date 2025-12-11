'use client'

import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Star, TrendingUp, LogIn, UserPlus, User } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

export default function Header() {
  const router = useRouter()
  const { user, loading, isAuthenticated, setShowLoginModal, setShowRegisterModal } = useAuth()

  return (
    <header className="hidden lg:block sticky top-0 z-40 w-full bg-slate-900/95 backdrop-blur-xl border-b border-white/10 h-20">
      <div className="px-6 py-4 h-full">
        <div className="flex items-center justify-between h-full">
          {/* Logo on Left */}
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white">SuperSohbet</h2>
          </div>

          {loading ? (
            <div className="w-48 h-8 bg-white/5 animate-pulse rounded-lg"></div>
          ) : isAuthenticated && user ? (
            <>
              {/* User Info on Right */}
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="flex items-center gap-1 text-yellow-400 justify-end">
                    <Star className="w-4 h-4 fill-yellow-400" />
                    <span className="text-lg font-bold">{user.points.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-gray-400">Puan</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-purple-400 justify-end">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-lg font-bold">{user.xp.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-gray-400">XP</p>
                </div>

                {/* User Profile Button */}
                <button
                  onClick={() => router.push('/profile')}
                  className="flex items-center gap-3 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 transition-all"
                >
                  <Avatar className="w-10 h-10 border-2 border-white/20">
                    <AvatarImage src={user.photoUrl} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold">
                      {user.firstName?.[0] || user.username?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <h3 className="text-sm font-bold text-white">
                      {user.firstName || user.username || 'Kullanıcı'}
                    </h3>
                    <div className="flex items-center gap-1">
                      {user.rank && (
                        <Badge
                          className="text-xs font-semibold py-0 px-1.5 h-5"
                          style={{ backgroundColor: user.rank.color }}
                        >
                          {user.rank.icon} {user.rank.name}
                        </Badge>
                      )}
                      {user.leaderboardRank && user.leaderboardRank <= 10 && (
                        <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-500 py-0 px-1.5 h-5">
                          #{user.leaderboardRank}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Not Authenticated - Show Login/Register Buttons */}
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowLoginModal(true)}
                  className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Giriş Yap
                </Button>
                <Button
                  onClick={() => setShowRegisterModal(true)}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Kayıt Ol
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
