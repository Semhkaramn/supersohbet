'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import BottomNav from '@/components/BottomNav'
import {
  Trophy,
  Ticket,
  Heart,
  Home,
  MessageSquare,
  Settings
} from 'lucide-react'

function MenuContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const userId = searchParams.get('userId')

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      router.push('/')
      return
    }
    setLoading(false)
  }, [userId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  const menuItems = [
    {
      title: 'Kanallar',
      description: 'Zorunlu kanallar',
      icon: MessageSquare,
      href: `/channels?userId=${userId}`,
      gradient: 'from-slate-500/20 to-slate-700/20',
      iconColor: 'text-slate-400',
      borderColor: 'border-slate-500/30'
    },
    {
      title: 'Ana Sayfa',
      description: 'Dashboard ve istatistiklerim',
      icon: Home,
      href: `/dashboard?userId=${userId}`,
      gradient: 'from-cyan-500/20 to-blue-500/20',
      iconColor: 'text-cyan-400',
      borderColor: 'border-cyan-500/30'
    },
    {
      title: 'Şans Çarkı',
      description: 'Günlük ücretsiz çevirme',
      icon: Ticket,
      href: `/wheel?userId=${userId}`,
      gradient: 'from-orange-500/20 to-red-500/20',
      iconColor: 'text-orange-400',
      borderColor: 'border-orange-500/30'
    },
    {
      title: 'Liderlik Sıralaması',
      description: 'En iyi kullanıcılar',
      icon: Trophy,
      href: `/leaderboard?userId=${userId}`,
      gradient: 'from-yellow-500/20 to-orange-500/20',
      iconColor: 'text-yellow-400',
      borderColor: 'border-yellow-500/30'
    },
    {
      title: 'Sponsorlar',
      description: 'Destekçilerimiz',
      icon: Heart,
      href: `/sponsors?userId=${userId}`,
      gradient: 'from-red-500/20 to-pink-500/20',
      iconColor: 'text-red-400',
      borderColor: 'border-red-500/30'
    }
  ]

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-600 to-slate-800 p-4">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-xl font-bold text-white flex items-center justify-center gap-2">
            <Settings className="w-5 h-5" />
            Menü
          </h1>
        </div>
      </div>

      {/* Menu Grid */}
      <div className="max-w-2xl mx-auto px-4 py-6">
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
