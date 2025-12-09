'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  User,
  ShoppingBag,
  FileText,
  Users,
  Crown,
  Gift,
  ChevronRight,
  Sparkles
} from 'lucide-react'

interface MenuDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
}

interface UserData {
  id: string
  username?: string
  firstName?: string
  photoUrl?: string
  points: number
  xp: number
  rank?: {
    name: string
    icon: string
  }
}

export function MenuDrawer({ open, onOpenChange, userId }: MenuDrawerProps) {
  const router = useRouter()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && !userData) {
      loadUserData()
    }
  }, [open, userId])

  async function loadUserData() {
    if (!userId) return
    setLoading(true)
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

  const menuItems = [
    {
      title: 'Profilim',
      description: 'Profil bilgilerim ve geçmişim',
      icon: User,
      href: `/profile?userId=${userId}`,
      gradient: 'from-blue-500/20 to-indigo-500/20',
      iconColor: 'text-blue-400',
      borderColor: 'border-blue-500/30'
    },
    {
      title: 'Referans',
      description: 'Arkadaşlarını davet et, ödül kazan',
      icon: Users,
      href: `/referral?userId=${userId}`,
      gradient: 'from-orange-500/20 to-red-500/20',
      iconColor: 'text-orange-400',
      borderColor: 'border-orange-500/30'
    },
    {
      title: 'Mağaza',
      description: 'Ödüllere göz at ve satın al',
      icon: ShoppingBag,
      href: `/shop?userId=${userId}`,
      gradient: 'from-emerald-500/20 to-teal-500/20',
      iconColor: 'text-emerald-400',
      borderColor: 'border-emerald-500/30'
    },
    {
      title: 'Görevler',
      description: 'Günlük ve haftalık görevler',
      icon: FileText,
      href: `/tasks?userId=${userId}`,
      gradient: 'from-purple-500/20 to-pink-500/20',
      iconColor: 'text-purple-400',
      borderColor: 'border-purple-500/30'
    }
  ]

  function handleNavigate(href: string) {
    onOpenChange(false)
    router.push(href)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent onClose={() => onOpenChange(false)}>
        {loading || !userData ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* User Profile Section */}
            <div className="bg-gradient-to-br from-blue-600/30 to-purple-600/30 p-6 border-b border-white/10">
              <div className="flex items-center gap-4 mb-4">
                <Avatar className="w-16 h-16 border-4 border-white/30 shadow-xl">
                  {userData.photoUrl && <AvatarImage src={userData.photoUrl} alt={userData.firstName || userData.username || 'User'} />}
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-xl font-bold">
                    {userData.firstName?.[0] || userData.username?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-white">
                    {userData.firstName || userData.username || 'Kullanıcı'}
                  </h2>
                  {userData.username && (
                    <p className="text-white/60 text-sm">@{userData.username}</p>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Gift className="w-4 h-4 text-yellow-400" />
                    <span className="text-white/80 text-xs">Puan</span>
                  </div>
                  <p className="text-xl font-bold text-white">{userData.points.toLocaleString()}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Crown className="w-4 h-4 text-purple-400" />
                    <span className="text-white/80 text-xs">XP</span>
                  </div>
                  <p className="text-xl font-bold text-white">{userData.xp.toLocaleString()}</p>
                </div>
              </div>

              {/* Rank */}
              {userData.rank && (
                <div className="mt-3 bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{userData.rank.icon}</span>
                    <div>
                      <p className="text-white/60 text-xs">Rütbe</p>
                      <p className="text-white font-semibold">{userData.rank.name}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Menu Items */}
            <div className="flex-1 p-6 space-y-3 overflow-y-auto">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-bold text-white">Menü</h3>
              </div>

              {menuItems.map((item) => (
                <button
                  key={item.title}
                  onClick={() => handleNavigate(item.href)}
                  className={`w-full bg-gradient-to-br ${item.gradient} border ${item.borderColor} rounded-lg p-4 hover:scale-[1.02] transition-transform backdrop-blur-sm text-left group`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center border ${item.borderColor}`}>
                      <item.icon className={`w-6 h-6 ${item.iconColor}`} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-white mb-0.5">{item.title}</h4>
                      <p className="text-xs text-slate-400">{item.description}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-white/60 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
