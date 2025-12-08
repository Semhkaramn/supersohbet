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
