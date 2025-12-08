'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Users,
  MessageSquare,
  ShoppingCart,
  Ticket,
  Heart,
  Settings,
  BarChart3,
  LogOut,
  FileText
} from 'lucide-react'
import Link from 'next/link'

interface Stats {
  totalUsers: number
  totalPoints: number
  totalPurchases: number
  totalSpins: number
  messages: {
    total: number
    daily: number
    weekly: number
    monthly: number
  }
}

export default function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin')
      return
    }
    loadStats()
  }, [])

  async function loadStats() {
    try {
      const response = await fetch('/api/admin/stats')
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleLogout() {
    localStorage.removeItem('admin_token')
    router.push('/admin')
  }

  const menuItems = [
    {
      title: 'Kanal Yönetimi',
      description: 'Zorunlu kanalları ekle/düzenle',
      icon: MessageSquare,
      href: '/admin/channels',
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Kullanıcılar',
      description: 'Tüm kullanıcıları görüntüle',
      icon: Users,
      href: '/admin/users',
      color: 'from-purple-500 to-purple-600'
    },
    {
      title: 'Görevler',
      description: 'Görevleri ekle/düzenle',
      icon: FileText,
      href: '/admin/tasks',
      color: 'from-indigo-500 to-indigo-600'
    },
    {
      title: 'Market Yönetimi',
      description: 'Ürünleri ekle/düzenle',
      icon: ShoppingCart,
      href: '/admin/shop',
      color: 'from-emerald-500 to-emerald-600'
    },
    {
      title: 'Çark Ödülleri',
      description: 'Çark ödüllerini yönet',
      icon: Ticket,
      href: '/admin/wheel',
      color: 'from-orange-500 to-orange-600'
    },
    {
      title: 'Sponsorlar',
      description: 'Sponsor ekle/düzenle',
      icon: Heart,
      href: '/admin/sponsors',
      color: 'from-pink-500 to-pink-600'
    },
    {
      title: 'Rütbe Sistemi',
      description: 'Rütbeleri yönet',
      icon: BarChart3,
      href: '/admin/ranks',
      color: 'from-yellow-500 to-yellow-600'
    },
    {
      title: 'Sistem Ayarları',
      description: 'Bot ve sistem parametreleri',
      icon: Settings,
      href: '/admin/settings',
      color: 'from-slate-500 to-slate-600'
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Admin Paneli</h1>
            <p className="text-gray-400">SüperSohbet Bot Yönetimi</p>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="border-white/20 hover:bg-white/10"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Çıkış Yap
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-blue-500/30 p-6">
            <div className="flex items-center gap-3">
              <Users className="w-10 h-10 text-blue-400" />
              <div>
                <p className="text-3xl font-bold text-white">{stats?.totalUsers || 0}</p>
                <p className="text-blue-200 text-sm">Toplam Kullanıcı</p>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border-yellow-500/30 p-6">
            <div className="flex items-center gap-3">
              <ShoppingCart className="w-10 h-10 text-yellow-400" />
              <div>
                <p className="text-3xl font-bold text-white">{stats?.totalPurchases || 0}</p>
                <p className="text-yellow-200 text-sm">Toplam Satın Alma</p>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border-purple-500/30 p-6">
            <div className="flex items-center gap-3">
              <Ticket className="w-10 h-10 text-purple-400" />
              <div>
                <p className="text-3xl font-bold text-white">{stats?.totalSpins || 0}</p>
                <p className="text-purple-200 text-sm">Toplam Çevirme</p>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border-emerald-500/30 p-6">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-10 h-10 text-emerald-400" />
              <div>
                <p className="text-3xl font-bold text-white">{stats?.totalPoints || 0}</p>
                <p className="text-emerald-200 text-sm">Toplam Puan</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Mesaj İstatistikleri */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <MessageSquare className="w-6 h-6" />
            Mesaj İstatistikleri
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 border-cyan-500/30 p-6">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-10 h-10 text-cyan-400" />
                <div>
                  <p className="text-3xl font-bold text-white">{stats?.messages?.daily || 0}</p>
                  <p className="text-cyan-200 text-sm">Günlük Mesaj</p>
                </div>
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-teal-500/20 to-teal-600/20 border-teal-500/30 p-6">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-10 h-10 text-teal-400" />
                <div>
                  <p className="text-3xl font-bold text-white">{stats?.messages?.weekly || 0}</p>
                  <p className="text-teal-200 text-sm">Haftalık Mesaj</p>
                </div>
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-green-500/20 to-green-600/20 border-green-500/30 p-6">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-10 h-10 text-green-400" />
                <div>
                  <p className="text-3xl font-bold text-white">{stats?.messages?.monthly || 0}</p>
                  <p className="text-green-200 text-sm">Aylık Mesaj</p>
                </div>
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-lime-500/20 to-lime-600/20 border-lime-500/30 p-6">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-10 h-10 text-lime-400" />
                <div>
                  <p className="text-3xl font-bold text-white">{stats?.messages?.total || 0}</p>
                  <p className="text-lime-200 text-sm">Tüm Zamanlar</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <Link key={item.href} href={item.href}>
                <Card className="bg-white/5 border-white/10 p-6 hover:bg-white/10 transition-all hover:scale-105 cursor-pointer">
                  <div className={`w-14 h-14 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center mb-4`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">{item.title}</h3>
                  <p className="text-gray-400 text-sm">{item.description}</p>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
