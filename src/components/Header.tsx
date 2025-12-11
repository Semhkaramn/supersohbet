'use client'

import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Star, TrendingUp, LogIn, UserPlus, User, LogOut } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { toast } from 'sonner'

export default function Header() {
  const router = useRouter()
  const { user, loading, isAuthenticated, setShowLoginModal, setShowRegisterModal, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    toast.success('Çıkış yapıldı')
    router.push('/')
  }

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-900/95 backdrop-blur-xl border-b border-white/10 h-16 lg:h-20">
      <div className="px-3 lg:px-6 py-2 lg:py-4 h-full">
        <div className="flex items-center justify-between h-full">
          {/* Logo on Left - Space for hamburger on mobile */}
          <div className="flex items-center gap-3 pl-12 lg:pl-0">
            <h2 className="text-lg lg:text-xl font-bold text-white">SuperSohbet</h2>
          </div>

          {loading ? (
            <div className="w-32 lg:w-48 h-6 lg:h-8 bg-white/5 animate-pulse rounded-lg"></div>
          ) : isAuthenticated && user ? (
            <>
              {/* User Info on Right */}
              <div className="flex items-center gap-2 lg:gap-6">
                {/* Stats - Hidden on small mobile, visible on tablet+ */}
                <div className="hidden md:flex items-center gap-3 lg:gap-6">
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-yellow-400 justify-end">
                      <Star className="w-3 lg:w-4 h-3 lg:h-4 fill-yellow-400" />
                      <span className="text-sm lg:text-lg font-bold">{user.points.toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-gray-400">Puan</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-purple-400 justify-end">
                      <TrendingUp className="w-3 lg:w-4 h-3 lg:h-4" />
                      <span className="text-sm lg:text-lg font-bold">{user.xp.toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-gray-400">XP</p>
                  </div>
                </div>

                {/* User Profile Button */}
                <button
                  onClick={() => router.push('/profile')}
                  className="flex items-center gap-2 lg:gap-3 px-2 lg:px-4 py-1.5 lg:py-2 rounded-lg lg:rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 transition-all"
                >
                  <Avatar className="w-8 lg:w-10 h-8 lg:h-10 border-2 border-white/20">
                    <AvatarImage src={user.photoUrl} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-xs lg:text-sm">
                      {user.firstName?.[0] || user.username?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left hidden sm:block">
                    <h3 className="text-xs lg:text-sm font-bold text-white">
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

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="p-2 lg:p-2.5 rounded-lg bg-red-600 hover:bg-red-700 transition-all shadow-lg hover:shadow-xl hover:scale-105"
                  title="Çıkış Yap"
                >
                  <LogOut className="w-4 h-4 text-white" />
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Not Authenticated - Show Login/Register Buttons */}
              <div className="flex items-center gap-2 lg:gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLoginModal(true)}
                  className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 text-xs lg:text-sm"
                >
                  <LogIn className="w-3 lg:w-4 h-3 lg:h-4 mr-1 lg:mr-2" />
                  <span className="hidden sm:inline">Giriş Yap</span>
                  <span className="sm:hidden">Giriş</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowRegisterModal(true)}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-xs lg:text-sm"
                >
                  <UserPlus className="w-3 lg:w-4 h-3 lg:h-4 mr-1 lg:mr-2" />
                  <span className="hidden sm:inline">Kayıt Ol</span>
                  <span className="sm:hidden">Kayıt</span>
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
