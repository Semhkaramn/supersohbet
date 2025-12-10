'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  ArrowLeft,
  Users,
  Edit,
  Search,
  Ban,
  ShieldCheck,
  MessageSquare,
  Coins,
  Award,
  ShoppingCart,
  Ticket,
  TrendingUp,
  Clock,
  UserX,
  UserCheck
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface User {
  id: string
  telegramId?: string | null // ✅ Opsiyonel
  username?: string
  firstName?: string
  lastName?: string
  photoUrl?: string
  points: number
  xp: number
  totalMessages: number
  dailySpinsLeft: number
  isBanned: boolean
  banReason?: string
  bannedAt?: string
  bannedBy?: string
  createdAt: string
  rank?: {
    name: string
    icon: string
    color: string
  }
  _count: {
    purchases: number
    wheelSpins: number
    messages: number
  }
}

interface Stats {
  totalUsers: number
  bannedUsers: number
  hadStartUsers: number
  usersWithMessages: number
  messages: {
    total: number
    daily: number
    weekly: number
    monthly: number
  }
}

interface UserDetail {
  user: any
  wheelSpins: any[]
  pointHistory: any[]
  xpHistory: any[]
  purchases: any[]
  taskHistory: any[]
  messageStats: {
    daily: number
    weekly: number
    monthly: number
    total: number
    recent: any[]
  }
}

export default function AdminStatisticsPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('points')
  const [sortOrder, setSortOrder] = useState('desc')
  const [bannedFilter, setBannedFilter] = useState<string>('all')

  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    points: 0,
    xp: 0,
    dailySpinsLeft: 1
  })

  // Görev kategorilerini Türkçeye çevir
  function translateTaskCategory(category: string): string {
    const translations: Record<string, string> = {
      'daily': 'Günlük',
      'weekly': 'Haftalık',
      'permanent': 'Kalıcı'
    }
    return translations[category] || category
  }

  // Görev türlerini Türkçeye çevir
  function translateTaskType(taskType: string): string {
    const translations: Record<string, string> = {
      'spin_wheel': 'Çark Çevir',
      'send_messages': 'Mesaj Gönder',
      'invite_users': 'Kullanıcı Davet Et',
      'earn_points': 'Puan Kazan',
      'reach_level': 'Seviye Ulaş'
    }
    return translations[taskType] || taskType
  }

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin')
      return
    }
    loadStatistics()
  }, [])

  // Anlık arama için yeni useEffect - searchTerm, period veya bannedFilter değiştiğinde otomatik arama yap
  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) return

    const delayDebounceFn = setTimeout(() => {
      loadStatistics()
    }, 300) // 300ms debounce - kullanıcı yazmayı bitirdiğinde arama yapar

    return () => clearTimeout(delayDebounceFn)
  }, [searchTerm, sortBy, sortOrder, bannedFilter])

  async function loadStatistics() {
    try {
      const bannedParam = bannedFilter === 'all' ? '' : `&banned=${bannedFilter}`
      const response = await fetch(`/api/admin/statistics?search=${searchTerm}&sortBy=${sortBy}&sortOrder=${sortOrder}${bannedParam}`)
      const data = await response.json()
      setUsers(data.users || [])
      setStats(data.stats)
    } catch (error) {
      console.error('Error loading statistics:', error)
      toast.error('İstatistikler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  async function loadUserDetail(userId: string) {
    setLoadingDetail(true)
    try {
      const response = await fetch(`/api/admin/statistics/user/${userId}`)
      const data = await response.json()
      setUserDetail(data)
    } catch (error) {
      console.error('Error loading user detail:', error)
      toast.error('Kullanıcı detayları yüklenemedi')
    } finally {
      setLoadingDetail(false)
    }
  }

  function openDetailDialog(user: User) {
    setSelectedUser(user)
    setDetailDialogOpen(true)
    loadUserDetail(user.id)
  }

  function openEditDialog(user: User) {
    setEditingUser(user)
    setFormData({
      points: user.points,
      xp: user.xp,
      dailySpinsLeft: user.dailySpinsLeft
    })
    setEditDialogOpen(true)
  }

  async function handleBanToggle(userId: string, isBanned: boolean) {
    const action = isBanned ? 'unban' : 'ban'
    const reason = !isBanned ? prompt('Ban nedeni:') : undefined

    if (!isBanned && !reason) return

    try {
      const response = await fetch(`/api/admin/users/${userId}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          reason,
          adminUsername: 'Admin' // Buraya gerçek admin kullanıcı adı gelebilir
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success(data.message)
        loadStatistics()
      } else {
        toast.error(data.error || 'İşlem başarısız')
      }
    } catch (error) {
      console.error('Ban toggle error:', error)
      toast.error('Bir hata oluştu')
    }
  }

  async function handleUpdateUser(e: React.FormEvent) {
    e.preventDefault()
    if (!editingUser) return

    try {
      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (data.user) {
        toast.success('Kullanıcı güncellendi')
        setEditDialogOpen(false)
        loadStatistics()
      } else {
        toast.error(data.error || 'Güncelleme başarısız')
      }
    } catch (error) {
      console.error('Update error:', error)
      toast.error('Bir hata oluştu')
    }
  }

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
            <Link href="/admin/dashboard">
              <Button variant="outline" className="mb-4 border-white/20 hover:bg-white/10">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Geri
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-8 h-8" />
              İstatistikler ve Kullanıcı Yönetimi
            </h1>
            <p className="text-gray-400 mt-1">Detaylı analiz ve kullanıcı yönetimi</p>
          </div>
        </div>

        {/* Overall Stats */}
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

          <Card className="bg-gradient-to-br from-green-500/20 to-green-600/20 border-green-500/30 p-6">
            <div className="flex items-center gap-3">
              <UserCheck className="w-10 h-10 text-green-400" />
              <div>
                <p className="text-3xl font-bold text-white">{stats?.hadStartUsers || 0}</p>
                <p className="text-green-200 text-sm">Hadstart Yapanlar</p>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-red-500/20 to-red-600/20 border-red-500/30 p-6">
            <div className="flex items-center gap-3">
              <UserX className="w-10 h-10 text-red-400" />
              <div>
                <p className="text-3xl font-bold text-white">{stats?.bannedUsers || 0}</p>
                <p className="text-red-200 text-sm">Banlı Kullanıcı</p>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border-purple-500/30 p-6">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-10 h-10 text-purple-400" />
              <div>
                <p className="text-3xl font-bold text-white">{stats?.usersWithMessages || 0}</p>
                <p className="text-purple-200 text-sm">Gruptaki Kullanıcılar</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Message Statistics */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <MessageSquare className="w-6 h-6" />
            Mesaj İstatistikleri
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 border-cyan-500/30 p-6">
              <div className="flex items-center gap-3">
                <Clock className="w-10 h-10 text-cyan-400" />
                <div>
                  <p className="text-3xl font-bold text-white">{stats?.messages?.daily || 0}</p>
                  <p className="text-cyan-200 text-sm">Günlük Mesaj</p>
                </div>
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-teal-500/20 to-teal-600/20 border-teal-500/30 p-6">
              <div className="flex items-center gap-3">
                <Clock className="w-10 h-10 text-teal-400" />
                <div>
                  <p className="text-3xl font-bold text-white">{stats?.messages?.weekly || 0}</p>
                  <p className="text-teal-200 text-sm">Haftalık Mesaj</p>
                </div>
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-green-500/20 to-green-600/20 border-green-500/30 p-6">
              <div className="flex items-center gap-3">
                <Clock className="w-10 h-10 text-green-400" />
                <div>
                  <p className="text-3xl font-bold text-white">{stats?.messages?.monthly || 0}</p>
                  <p className="text-green-200 text-sm">Aylık Mesaj</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white"
              placeholder="Kullanıcı ara (isim, username, telegram ID)..."
            />
          </div>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full md:w-[200px] bg-white/5 border-white/10 text-white">
              <SelectValue placeholder="Sırala" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/20">
              <SelectItem value="points">Puana Göre</SelectItem>
              <SelectItem value="messages">Mesaj Sayısına Göre</SelectItem>
              <SelectItem value="rank">Rütbeye Göre</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortOrder} onValueChange={setSortOrder}>
            <SelectTrigger className="w-full md:w-[200px] bg-white/5 border-white/10 text-white">
              <SelectValue placeholder="Sıralama" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/20">
              <SelectItem value="desc">Yüksekten Düşüğe</SelectItem>
              <SelectItem value="asc">Düşükten Yükseğe</SelectItem>
            </SelectContent>
          </Select>

          <Select value={bannedFilter} onValueChange={setBannedFilter}>
            <SelectTrigger className="w-full md:w-[200px] bg-white/5 border-white/10 text-white">
              <SelectValue placeholder="Durum" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/20">
              <SelectItem value="all">Tümü</SelectItem>
              <SelectItem value="false">Aktif</SelectItem>
              <SelectItem value="true">Banlı</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Users List */}
        <div className="space-y-3">
          {users.length === 0 ? (
            <Card className="bg-white/5 border-white/10 p-12 text-center">
              <Users className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">Kullanıcı bulunamadı</p>
            </Card>
          ) : (
            users.map((user) => (
              <Card key={user.id} className={`border-white/10 p-4 ${user.isBanned ? 'bg-red-500/10 border-red-500/30' : 'bg-white/5'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={user.photoUrl || undefined} alt={user.firstName || user.username || 'User'} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white font-bold">
                          {(user.firstName || user.username || 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                          {user.firstName || user.username || 'Kullanıcı'}
                          {user.rank && (
                            <span className="text-sm" style={{ color: user.rank.color }}>
                              {user.rank.icon} {user.rank.name}
                            </span>
                          )}
                          {user.isBanned && (
                            <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded">
                              BANLI
                            </span>
                          )}
                        </h3>
                        <p className="text-gray-400 text-sm">@{user.username || user.telegramId || 'Yok'}</p>
                        {user.isBanned && user.banReason && (
                          <p className="text-red-400 text-xs mt-1">Ban Nedeni: {user.banReason}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-4 mt-2 flex-wrap">
                      <span className="text-sm text-yellow-400 flex items-center gap-1">
                        <Coins className="w-3 h-3" /> {user.points} Puan
                      </span>
                      <span className="text-sm text-purple-400 flex items-center gap-1">
                        <Award className="w-3 h-3" /> {user.xp} XP
                      </span>
                      <span className="text-sm text-blue-400 flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> {user._count.messages} Mesaj
                      </span>
                      <span className="text-sm text-green-400 flex items-center gap-1">
                        <ShoppingCart className="w-3 h-3" /> {user._count.purchases} Satın Alma
                      </span>
                      <span className="text-sm text-orange-400 flex items-center gap-1">
                        <Ticket className="w-3 h-3" /> {user._count.wheelSpins} Toplam Çevirme
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openDetailDialog(user)}
                      className="border-white/20 hover:bg-white/10"
                    >
                      <TrendingUp className="w-4 h-4 mr-1" />
                      Detaylar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditDialog(user)}
                      className="border-white/20 hover:bg-white/10"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleBanToggle(user.id, user.isBanned)}
                      className={user.isBanned
                        ? "border-green-500/20 hover:bg-green-500/10 text-green-400"
                        : "border-red-500/20 hover:bg-red-500/10 text-red-400"
                      }
                    >
                      {user.isBanned ? (
                        <><ShieldCheck className="w-4 h-4 mr-1" /> Ban Kaldır</>
                      ) : (
                        <><Ban className="w-4 h-4 mr-1" /> Banla</>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* User Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="bg-slate-900 border-white/20 max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white text-2xl">
              Kullanıcı Detayları
            </DialogTitle>
          </DialogHeader>
          {loadingDetail ? (
            <div className="flex items-center justify-center p-12">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : userDetail && selectedUser ? (
            <div className="space-y-6">
              {/* User Info */}
              <Card className="bg-white/5 border-white/10 p-6">
                <div className="flex items-center gap-4 mb-6">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={selectedUser.photoUrl || undefined} alt={selectedUser.firstName || selectedUser.username || 'User'} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white font-bold text-2xl">
                      {(selectedUser.firstName || selectedUser.username || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-2xl font-bold text-white">
                      {selectedUser.firstName || selectedUser.username || 'Kullanıcı'}
                    </h3>
                    <p className="text-gray-400">@{selectedUser.username || selectedUser.telegramId}</p>
                    {selectedUser.rank && (
                      <p className="text-sm mt-1" style={{ color: selectedUser.rank.color }}>
                        {selectedUser.rank.icon} {selectedUser.rank.name}
                      </p>
                    )}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-4">Genel Bilgiler</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-400 text-sm">İsim</p>
                    <p className="text-white font-semibold">{selectedUser.firstName || 'Belirtilmemiş'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Kullanıcı Adı</p>
                    <p className="text-white font-semibold">@{selectedUser.username || selectedUser.telegramId}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Telegram ID</p>
                    <p className="text-white font-semibold">{selectedUser.telegramId}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Kayıt Tarihi</p>
                    <p className="text-white font-semibold">
                      {new Date(selectedUser.createdAt).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Puan</p>
                    <p className="text-yellow-400 font-bold text-lg">{selectedUser.points}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">XP</p>
                    <p className="text-purple-400 font-bold text-lg">{selectedUser.xp}</p>
                  </div>
                  {userDetail.user.referrals?.length > 0 && (
                    <div>
                      <p className="text-gray-400 text-sm">Referanslar</p>
                      <p className="text-green-400 font-bold text-lg">{userDetail.user.referrals.length}</p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Tabs for different statistics */}
              <Tabs defaultValue="messages" className="w-full">
                <TabsList className="bg-white/5 border-white/10 w-full grid grid-cols-6">
                  <TabsTrigger value="messages">Mesajlar</TabsTrigger>
                  <TabsTrigger value="points">Puan</TabsTrigger>
                  <TabsTrigger value="referrals">Referanslar</TabsTrigger>
                  <TabsTrigger value="tasks">Görevler</TabsTrigger>
                  <TabsTrigger value="wheel">Çark</TabsTrigger>
                  <TabsTrigger value="purchases">Market</TabsTrigger>
                </TabsList>

                <TabsContent value="messages" className="space-y-4">
                  <Card className="bg-white/5 border-white/10 p-6">
                    <h4 className="text-lg font-bold text-white mb-4">Mesaj İstatistikleri</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-cyan-400">{userDetail.messageStats.daily}</p>
                        <p className="text-gray-400 text-sm">Bugün</p>
                      </div>
                      <div className="text-center">
                        <p className="text-3xl font-bold text-teal-400">{userDetail.messageStats.weekly}</p>
                        <p className="text-gray-400 text-sm">Bu Hafta</p>
                      </div>
                      <div className="text-center">
                        <p className="text-3xl font-bold text-green-400">{userDetail.messageStats.monthly}</p>
                        <p className="text-gray-400 text-sm">Bu Ay</p>
                      </div>
                      <div className="text-center">
                        <p className="text-3xl font-bold text-lime-400">{userDetail.messageStats.total}</p>
                        <p className="text-gray-400 text-sm">Toplam</p>
                      </div>
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="points" className="space-y-2">
                  <Card className="bg-white/5 border-white/10 p-6">
                    <h4 className="text-lg font-bold text-white mb-4">Puan Geçmişi</h4>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {userDetail.pointHistory.map((ph: any) => (
                        <div key={ph.id} className="bg-white/5 p-3 rounded flex justify-between items-center">
                          <div>
                            <p className="text-white font-semibold">{ph.description}</p>
                            <p className="text-gray-400 text-xs">
                              {new Date(ph.createdAt).toLocaleString('tr-TR')}
                            </p>

                          </div>
                          <div className={`text-lg font-bold ${ph.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {ph.amount > 0 ? '+' : ''}{ph.amount}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="referrals" className="space-y-2">
                  <Card className="bg-white/5 border-white/10 p-6">
                    <h4 className="text-lg font-bold text-white mb-4">Referans Bilgileri</h4>

                    {/* Referans İstatistikleri */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 border-green-500/30 border rounded-lg p-4">
                        <p className="text-green-300 text-sm mb-1">Toplam Referanslar</p>
                        <p className="text-3xl font-bold text-white">{userDetail.user.totalReferrals || 0}</p>
                      </div>
                      <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 border-orange-500/30 border rounded-lg p-4">
                        <p className="text-orange-300 text-sm mb-1">Referans Puanları</p>
                        <p className="text-3xl font-bold text-white">{userDetail.user.referralPoints || 0}</p>
                      </div>
                    </div>

                    {/* Davet Eden Kişi */}
                    {userDetail.user.referredBy && (
                      <div className="mb-6">
                        <h5 className="text-md font-semibold text-white mb-3">Davet Eden Kişi</h5>
                        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              {userDetail.user.referredBy.photoUrl && <AvatarImage src={userDetail.user.referredBy.photoUrl} alt={userDetail.user.referredBy.firstName || userDetail.user.referredBy.username || 'User'} />}
                              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold">
                                {(userDetail.user.referredBy.firstName || userDetail.user.referredBy.username || 'U').charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-white font-semibold">
                                {userDetail.user.referredBy.firstName || userDetail.user.referredBy.username || 'Kullanıcı'}
                              </p>
                              <p className="text-gray-400 text-sm">@{userDetail.user.referredBy.username || userDetail.user.referredBy.id}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Davet Ettikleri */}
                    <div>
                      <h5 className="text-md font-semibold text-white mb-3">
                        Davet Ettikleri ({userDetail.user.referrals?.length || 0})
                      </h5>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {userDetail.user.referrals && userDetail.user.referrals.length > 0 ? (
                          userDetail.user.referrals.map((ref: any) => (
                            <div key={ref.id} className="bg-white/5 border border-white/10 rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-10 w-10">
                                    {ref.photoUrl && <AvatarImage src={ref.photoUrl} alt={ref.firstName || ref.username || 'User'} />}
                                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white font-bold">
                                      {(ref.firstName || ref.username || 'U').charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="text-white font-semibold">
                                      {ref.firstName || ref.username || 'Kullanıcı'}
                                    </p>
                                    <p className="text-gray-400 text-sm">@{ref.username || ref.id}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-gray-400 text-xs">
                                    {new Date(ref.createdAt).toLocaleDateString('tr-TR')}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8">
                            <p className="text-gray-400">Henüz kimseyi davet etmemiş</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="tasks" className="space-y-2">
                  <Card className="bg-white/5 border-white/10 p-6">
                    <h4 className="text-lg font-bold text-white mb-4">Görev Geçmişi</h4>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {userDetail.taskHistory && userDetail.taskHistory.length > 0 ? (
                        userDetail.taskHistory.map((completion: any) => (
                          <div key={completion.id} className="bg-white/5 p-3 rounded flex justify-between items-center">
                            <div className="flex-1">
                              <p className="text-white font-semibold">{completion.task.title}</p>
                              {completion.task.description && (
                                <p className="text-gray-400 text-sm">{completion.task.description}</p>
                              )}
                              <p className="text-gray-400 text-xs mt-1">
                                {new Date(completion.claimedAt).toLocaleString('tr-TR')}
                              </p>
                              <div className="flex gap-2 mt-1">
                                <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">
                                  {translateTaskCategory(completion.task.category)}
                                </span>
                                <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">
                                  {translateTaskType(completion.task.taskType)}
                                </span>
                              </div>
                            </div>
                            <div className="text-right ml-4">
                              {completion.task.pointsReward > 0 && (
                                <div className="text-lg font-bold text-green-400">
                                  +{completion.task.pointsReward} Puan
                                </div>
                              )}
                              {completion.task.xpReward > 0 && (
                                <div className="text-sm text-yellow-400">
                                  +{completion.task.xpReward} XP
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-400 text-center py-8">Henüz tamamlanmış görev yok</p>
                      )}
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="wheel" className="space-y-2">
                  <Card className="bg-white/5 border-white/10 p-6">
                    <h4 className="text-lg font-bold text-white mb-4">Çark Geçmişi</h4>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {userDetail.wheelSpins.map((spin: any) => (
                        <div key={spin.id} className="bg-white/5 p-3 rounded flex justify-between items-center">
                          <div>
                            <p className="text-white font-semibold">{spin.prize.name}</p>
                            <p className="text-gray-400 text-xs">
                              {new Date(spin.spunAt).toLocaleString('tr-TR')}
                            </p>
                          </div>
                          <div className="text-lg font-bold text-green-400">
                            +{spin.pointsWon} Puan
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="purchases" className="space-y-2">
                  <Card className="bg-white/5 border-white/10 p-6">
                    <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5 text-green-400" />
                      Mağaza Satın Alma Geçmişi
                    </h4>
                    {userDetail.purchases && userDetail.purchases.length > 0 ? (
                      <>
                        <div className="mb-4 p-3 bg-gradient-to-br from-green-500/20 to-green-600/20 border-green-500/30 border rounded-lg">
                          <p className="text-green-300 text-sm mb-1">Toplam Satın Alma</p>
                          <p className="text-3xl font-bold text-white">{userDetail.purchases.length}</p>
                          <p className="text-green-200 text-xs mt-1">
                            Toplam Harcanan: {userDetail.purchases.reduce((sum: number, p: any) => sum + p.pointsSpent, 0)} Puan
                          </p>
                        </div>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {userDetail.purchases.map((purchase: any) => (
                            <div key={purchase.id} className="bg-gradient-to-br from-white/5 to-white/10 border border-white/10 p-4 rounded-lg hover:border-white/20 transition-all">
                              <div className="flex gap-4">
                                {purchase.item.imageUrl && (
                                  <div className="w-16 h-16 rounded-lg bg-white/5 flex-shrink-0 overflow-hidden border border-white/10">
                                    <img
                                      src={purchase.item.imageUrl}
                                      alt={purchase.item.name}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                )}
                                <div className="flex-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <p className="text-white font-semibold text-lg">{purchase.item.name}</p>
                                      <p className="text-gray-400 text-sm mt-1">{purchase.item.description}</p>
                                      <div className="flex items-center gap-3 mt-2">
                                        <p className="text-gray-400 text-xs flex items-center gap-1">
                                          <Clock className="w-3 h-3" />
                                          {new Date(purchase.purchasedAt).toLocaleString('tr-TR')}
                                        </p>
                                        <p className="text-gray-500 text-xs">
                                          ID: {purchase.id.slice(0, 8)}...
                                        </p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-xl font-bold text-red-400">
                                        -{purchase.pointsSpent}
                                      </div>
                                      <p className="text-gray-400 text-xs">Puan</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-12">
                        <ShoppingCart className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                        <p className="text-gray-400">Henüz mağazadan satın alma yapılmamış</p>
                      </div>
                    )}
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-slate-900 border-white/20">
          <DialogHeader>
            <DialogTitle className="text-white">Kullanıcıyı Düzenle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateUser} className="space-y-4">
            <div>
              <Label htmlFor="points" className="text-white">Puan</Label>
              <Input
                id="points"
                type="number"
                value={formData.points}
                onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) })}
                className="bg-white/5 border-white/10 text-white mt-1"
                required
              />
            </div>

            <div>
              <Label htmlFor="xp" className="text-white">XP</Label>
              <Input
                id="xp"
                type="number"
                value={formData.xp}
                onChange={(e) => setFormData({ ...formData, xp: parseInt(e.target.value) })}
                className="bg-white/5 border-white/10 text-white mt-1"
                required
              />
            </div>

            <div>
              <Label htmlFor="dailySpinsLeft" className="text-white">Günlük Çark Hakkı</Label>
              <Input
                id="dailySpinsLeft"
                type="number"
                value={formData.dailySpinsLeft}
                onChange={(e) => setFormData({ ...formData, dailySpinsLeft: parseInt(e.target.value) })}
                className="bg-white/5 border-white/10 text-white mt-1"
                min="0"
                required
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                className="flex-1 border-white/20 hover:bg-white/10"
              >
                İptal
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Güncelle
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
