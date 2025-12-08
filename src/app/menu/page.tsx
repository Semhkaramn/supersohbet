'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import BottomNav from '@/components/BottomNav'
import {
  User,
  ShoppingBag,
  FileText,
  Settings,
  Trophy,
  Ticket,
  Heart,
  Home,
  Crown,
  Gift,
  MessageSquare
} from 'lucide-react'

interface UserData {
  id: string
  username?: string
  firstName?: string
  points: number
  xp: number
  rank?: {
    name: string
    icon: string
  }
}

function MenuContent() {
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
    },
    {
      title: 'Kanallar',
      description: 'Zorunlu kanallar',
      icon: MessageSquare,
      href: `/channels?userId=${userId}`,
      gradient: 'from-slate-500/20 to-slate-700/20',
      iconColor: 'text-slate-400',
      borderColor: 'border-slate-500/30'
    }
  ]

  return (
    <div className="min-h-screen pb-24 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 p-6 pb-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <Avatar className="w-16 h-16 border-4 border-white/30 shadow-xl">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-xl font-bold">
                {userData.firstName?.[0] || userData.username?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-white">
                {userData.firstName || userData.username || 'Kullanıcı'}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-1">
                  <Gift className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-400 font-semibold text-sm">{userData.points}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Crown className="w-4 h-4 text-purple-400" />
                  <span className="text-purple-400 font-semibold text-sm">{userData.xp} XP</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Grid */}
      <div className="max-w-2xl mx-auto px-4 -mt-4">
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 p-4 mb-4">
          <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-400" />
            Menü
          </h2>
          <p className="text-slate-400 text-sm">Tüm özellikler ve kısa yollar</p>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          {menuItems.map((item) => (
            <Card
              key={item.title}
              onClick={() => router.push(item.href)}
              className={`bg-gradient-to-br ${item.gradient} ${item.borderColor} p-4 cursor-pointer hover:scale-105 transition-transform backdrop-blur-sm`}
            >
              <div className={`w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center mb-3 border ${item.borderColor}`}>
                <item.icon className={`w-6 h-6 ${item.iconColor}`} />
              </div>
              <h3 className="font-bold text-white mb-1 text-sm">{item.title}</h3>
              <p className="text-xs text-slate-400 line-clamp-2">{item.description}</p>
            </Card>
          ))}
        </div>
      </div>

      <BottomNav userId={userId!} />
    </div>
  )
}

export default function MenuPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <MenuContent />
    </Suspense>
  )
}
