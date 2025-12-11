'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import DashboardLayout from '@/components/DashboardLayout'
import ProtectedRoute from '@/components/ProtectedRoute'
import {
  Trophy, Star, MessageSquare, TrendingUp, ShoppingBag, Clock,
  CheckCircle2, Package, Users, History, Crown, Wallet,
  Building2, Edit2, Save, X, AlertCircle, Search, Plus, Trash2, Link2, Unlink,
  CreditCard
} from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface PointHistory {
  id: string
  amount: number
  type: string
  description: string
  adminUsername?: string
  createdAt: string
}

interface Rank {
  id: string
  name: string
  icon: string
  color: string
  minXp: number
  order: number
}

interface Sponsor {
  id: string
  name: string
  identifierType: string
  logoUrl?: string
}

interface UserSponsorInfo {
  id: string
  identifier: string
  sponsor: Sponsor
}

interface UserData {
  id: string
  telegramId?: string
  email?: string
  username?: string
  firstName?: string
  lastName?: string
  photoUrl?: string
  points: number
  xp: number
  totalMessages: number
  totalReferrals: number
  referralPoints: number
  pointHistory?: PointHistory[]
  messageStats?: {
    daily: number
    weekly: number
    monthly: number
    total: number
  }
  rank?: {
    name: string
    icon: string
    color: string
    minXp: number
  }
  nextRank?: {
    name: string
    minXp: number
  }
  allRanks?: Rank[]
  dailySpinsLeft: number
  leaderboardRank?: number
  createdAt: string
  walletAddress?: string
}

interface Purchase {
  id: string
  item: {
    name: string
    imageUrl?: string
  }
  pointsSpent: number
  status: string
  purchasedAt: string
}

interface TelegramStatus {
  connected: boolean
  canReconnect: boolean
  daysUntilReconnect?: number
}

function ProfileContent() {
  const router = useRouter()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)

  // Wallet states
  const [editingWallet, setEditingWallet] = useState(false)
  const [walletInput, setWalletInput] = useState('')

  // Sponsor states
  const [sponsorInfos, setSponsorInfos] = useState<UserSponsorInfo[]>([])
  const [allSponsors, setAllSponsors] = useState<Sponsor[]>([])
  const [editingSponsor, setEditingSponsor] = useState<string | null>(null)
  const [sponsorInput, setSponsorInput] = useState('')
  const [selectedSponsor, setSelectedSponsor] = useState<string | null>(null)
  const [sponsorSearch, setSponsorSearch] = useState('')

  // Telegram states
  const [telegramStatus, setTelegramStatus] = useState<TelegramStatus>({ connected: false, canReconnect: true })
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false)

  // Search state for all tabs
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [userRes, purchasesRes, sponsorInfoRes, sponsorsRes, telegramRes] = await Promise.all([
        fetch('/api/user/me'),
        fetch('/api/user/me/purchases'),
        fetch('/api/user/sponsor-info'),
        fetch('/api/sponsors'),
        fetch('/api/user/telegram-status')
      ])

      const userData = await userRes.json()
      const purchasesData = await purchasesRes.json()
      const sponsorData = await sponsorInfoRes.json()
      const sponsorsData = await sponsorsRes.json()
      const telegramData = await telegramRes.json()

      setUserData(userData)
      setPurchases(purchasesData.purchases || [])
      setWalletInput(userData.walletAddress || '')
      setSponsorInfos(sponsorData.sponsorInfos || [])
      setAllSponsors(sponsorsData.sponsors || [])
      setTelegramStatus(telegramData)
    } catch (error) {
      console.error('Error loading profile data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function saveWallet() {
    if (!walletInput.trim()) {
      toast.error('Cüzdan adresi boş olamaz')
      return
    }

    if (!walletInput.startsWith('T') || walletInput.length !== 34) {
      toast.error('Geçersiz TRC20 cüzdan adresi')
      return
    }

    try {
      const response = await fetch('/api/user/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: walletInput })
      })

      if (response.ok) {
        const data = await response.json()
        setUserData(prev => prev ? { ...prev, walletAddress: data.walletAddress } : null)
        setEditingWallet(false)
        toast.success('Cüzdan adresi kaydedildi')
      } else {
        toast.error('Kaydetme başarısız')
      }
    } catch (error) {
      console.error('Cüzdan kaydetme hatası:', error)
      toast.error('Bir hata oluştu')
    }
  }

  async function deleteWallet() {
    try {
      const response = await fetch('/api/user/wallet', { method: 'DELETE' })
      if (response.ok) {
        setUserData(prev => prev ? { ...prev, walletAddress: undefined } : null)
        setWalletInput('')
        setEditingWallet(false)
        toast.success('Cüzdan adresi silindi')
      }
    } catch (error) {
      toast.error('Bir hata oluştu')
    }
  }

  async function saveSponsorInfo(sponsorId: string) {
    if (!sponsorInput.trim()) {
      toast.error('Bilgi boş olamaz')
      return
    }

    const sponsor = allSponsors.find(s => s.id === sponsorId)
    if (!sponsor) return

    if (sponsor.identifierType === 'id' && !/^\d+$/.test(sponsorInput.trim())) {
      toast.error('ID sadece sayılardan oluşmalıdır')
      return
    }

    if (sponsor.identifierType === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sponsorInput.trim())) {
      toast.error('Geçerli bir email adresi giriniz')
      return
    }

    try {
      const response = await fetch('/api/user/sponsor-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sponsorId, identifier: sponsorInput.trim() })
      })

      if (response.ok) {
        await loadData()
        setEditingSponsor(null)
        setSponsorInput('')
        setSelectedSponsor(null)
        toast.success('Sponsor bilgisi kaydedildi')
      }
    } catch (error) {
      toast.error('Bir hata oluştu')
    }
  }

  async function deleteSponsorInfo(sponsorId: string) {
    try {
      const response = await fetch('/api/user/sponsor-info', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sponsorId })
      })

      if (response.ok) {
        await loadData()
        toast.success('Sponsor bilgisi silindi')
      }
    } catch (error) {
      toast.error('Bir hata oluştu')
    }
  }

  async function disconnectTelegram() {
    try {
      const response = await fetch('/api/user/telegram-disconnect', {
        method: 'POST'
      })

      if (response.ok) {
        await loadData()
        setShowDisconnectDialog(false)
        toast.success('Telegram bağlantısı koparıldı. 1 gün sonra tekrar bağlayabilirsiniz.')
      } else {
        const data = await response.json()
        toast.error(data.error || 'Bir hata oluştu')
      }
    } catch (error) {
      toast.error('Bir hata oluştu')
    }
  }

  const getIdentifierLabel = (type: string) => {
    switch (type) {
      case 'username': return 'Kullanıcı Adı'
      case 'id': return 'ID'
      case 'email': return 'Email'
      default: return 'Bilgi'
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
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-400">Kullanıcı bulunamadı</p>
      </div>
    )
  }

  const xpProgress = userData.nextRank
    ? ((userData.xp - (userData.rank?.minXp || 0)) / (userData.nextRank.minXp - (userData.rank?.minXp || 0))) * 100
    : 100

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Teslim Edildi': return <CheckCircle2 className="w-4 h-4 text-green-400" />
      case 'Hazırlanıyor': return <Package className="w-4 h-4 text-orange-400" />
      default: return <Clock className="w-4 h-4 text-yellow-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Teslim Edildi': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'Hazırlanıyor': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      default: return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Header Card - Kullanıcı Bilgileri */}
        <Card className="bg-gradient-to-br from-slate-800/60 via-slate-800/40 to-slate-900/60 border-slate-700/50 backdrop-blur-sm shadow-2xl shadow-blue-500/10 hover:shadow-blue-500/20 transition-all duration-300">
          <div className="p-8">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full opacity-70 group-hover:opacity-100 blur-lg transition-all duration-300"></div>
                <Avatar className="relative w-28 h-28 border-4 border-white/20 shadow-2xl ring-4 ring-slate-800/50">
                  {userData.photoUrl && <AvatarImage src={userData.photoUrl} />}
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white text-4xl font-bold">
                    {userData.firstName?.[0] || userData.username?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="flex-1 text-center md:text-left space-y-4">
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent mb-2">
                    {userData.firstName || userData.username || 'Kullanıcı'}
                  </h1>
                  <p className="text-slate-400 text-lg">@{userData.username || 'kullanici'}</p>
                </div>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                  {userData.rank && (
                    <Badge className="text-sm font-semibold py-1.5 px-3 shadow-lg" style={{ backgroundColor: userData.rank.color }}>
                      <span className="text-base mr-1">{userData.rank.icon}</span>
                      {userData.rank.name}
                    </Badge>
                  )}
                  {userData.leaderboardRank && userData.leaderboardRank <= 10 && (
                    <Badge className="bg-gradient-to-r from-yellow-500 via-yellow-400 to-orange-500 text-white border-0 shadow-lg shadow-yellow-500/50 py-1.5 px-3">
                      <Crown className="w-4 h-4 mr-1.5" />
                      #{userData.leaderboardRank} Sırada
                    </Badge>
                  )}
                  <Badge variant="outline" className="border-slate-600/60 text-slate-400 bg-slate-800/30 py-1.5 px-3">
                    <Clock className="w-3.5 h-3.5 mr-1.5" />
                    {new Date(userData.createdAt).toLocaleDateString('tr-TR')}
                  </Badge>
                </div>

                {/* Rank Progress */}
                {userData.nextRank && (
                  <div className="max-w-md bg-slate-900/40 rounded-lg p-4 border border-slate-700/30">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-400 font-medium">Seviye İlerlemesi</span>
                      <span className="text-white font-bold">{userData.xp.toLocaleString()} / {userData.nextRank.minXp.toLocaleString()} XP</span>
                    </div>
                    <Progress value={xpProgress} className="h-3 bg-slate-700/50" />
                    <p className="text-xs text-slate-500 mt-2 font-medium">
                      🎯 {(userData.nextRank.minXp - userData.xp).toLocaleString()} XP kaldı • {userData.nextRank.name} seviyesine yüksel
                    </p>
                  </div>
                )}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <Card className="bg-white/5 border-white/10 p-3 text-center backdrop-blur-sm">
                  <Star className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                  <div className="text-xl font-bold text-white">{userData.points}</div>
                  <p className="text-slate-400 text-xs">Puan</p>
                </Card>
                <Card className="bg-white/5 border-white/10 p-3 text-center backdrop-blur-sm">
                  <TrendingUp className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                  <div className="text-xl font-bold text-white">{userData.xp}</div>
                  <p className="text-slate-400 text-xs">XP</p>
                </Card>
                <Card className="bg-white/5 border-white/10 p-3 text-center backdrop-blur-sm">
                  <MessageSquare className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                  <div className="text-xl font-bold text-white">{userData.totalMessages}</div>
                  <p className="text-slate-400 text-xs">Mesaj</p>
                </Card>
                <Card className="bg-white/5 border-white/10 p-3 text-center backdrop-blur-sm">
                  <Users className="w-5 h-5 text-green-400 mx-auto mb-1" />
                  <div className="text-xl font-bold text-white">{userData.totalReferrals || 0}</div>
                  <p className="text-slate-400 text-xs">Davet</p>
                </Card>
              </div>
            </div>
          </div>
        </Card>

        {/* Telegram Connection Section */}
        <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Link2 className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-white">Telegram Bağlantısı</h2>
                <p className="text-slate-400 text-sm">
                  {userData.telegramId ? 'Bağlı' : 'Bağlı değil'}
                </p>
              </div>
              {userData.telegramId && (
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              )}
            </div>

            {userData.telegramId ? (
              <>
                {/* Telegram User Info Card */}
                <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 mb-3">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-16 h-16 border-2 border-blue-500/30">
                      {userData.photoUrl && <AvatarImage src={userData.photoUrl} />}
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-2xl font-bold">
                        {userData.firstName?.[0] || userData.username?.[0] || 'T'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold text-base mb-1">
                        {userData.firstName || 'Telegram User'}
                        {userData.lastName && ` ${userData.lastName}`}
                      </h3>
                      {userData.username && (
                        <p className="text-blue-400 text-sm mb-1">@{userData.username}</p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>ID:</span>
                        <span className="font-mono text-white">{userData.telegramId}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {telegramStatus.canReconnect ? (
                  <Button
                    onClick={() => setShowDisconnectDialog(true)}
                    size="sm"
                    variant="outline"
                    className="w-full border-red-500/50 text-red-400 hover:bg-red-500/20"
                  >
                    <Unlink className="w-4 h-4 mr-2" />
                    Telegram Bağlantısını Kopar
                  </Button>
                ) : (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                    <AlertCircle className="w-5 h-5 text-yellow-400 inline mr-2" />
                    <span className="text-yellow-400 text-sm">
                      {telegramStatus.daysUntilReconnect} gün sonra tekrar bağlayabilirsiniz
                    </span>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Not Connected - Show Connection Button */}
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-3 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-yellow-400 text-sm font-medium mb-1">Telegram Bağlı Değil</p>
                    <p className="text-slate-400 text-xs">
                      Telegram hesabınızı bağlayarak tüm özelliklere erişebilirsiniz.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/user/telegram-connection-token')
                      const data = await response.json()

                      if (data.token) {
                        // Telegram bot linkine yönlendir
                        const botUsername = await fetch('/api/settings/telegram-bot-username').then(r => r.json())
                        window.open(`https://t.me/${botUsername.username}?start=${data.token}`, '_blank')
                        toast.success('Telegram botu açıldı. Lütfen /start komutunu gönderin.')
                      }
                    } catch (error) {
                      toast.error('Bağlantı başlatılamadı')
                    }
                  }}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                >
                  <Link2 className="w-4 h-4 mr-2" />
                  Telegram'ı Bağla
                </Button>
              </>
            )}
          </div>
        </Card>

        {/* Tabs Section */}
        <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
          <Tabs defaultValue="payment" className="w-full">
            <div className="border-b border-slate-700">
              <TabsList className="w-full grid grid-cols-4 bg-transparent p-0 h-auto">
                <TabsTrigger
                  value="payment"
                  className="data-[state=active]:bg-slate-700/50 data-[state=active]:text-white rounded-none border-b-2 border-transparent data-[state=active]:border-green-500 py-3"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Ödeme Bilgileri</span>
                  <span className="sm:hidden">Ödeme</span>
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="data-[state=active]:bg-slate-700/50 data-[state=active]:text-white rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 py-3"
                >
                  <History className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Puan Geçmişi</span>
                  <span className="sm:hidden">Geçmiş</span>
                </TabsTrigger>
                <TabsTrigger
                  value="purchases"
                  className="data-[state=active]:bg-slate-700/50 data-[state=active]:text-white rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 py-3"
                >
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Alışverişler</span>
                  <span className="sm:hidden">Alımlar</span>
                </TabsTrigger>
                <TabsTrigger
                  value="ranks"
                  className="data-[state=active]:bg-slate-700/50 data-[state=active]:text-white rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 py-3"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Rütbeler</span>
                  <span className="sm:hidden">Seviye</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6">
              {/* Payment Tab - Wallet & Sponsors */}
              <TabsContent value="payment" className="mt-0 space-y-6">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <Input
                    type="text"
                    placeholder="Cüzdan veya sponsor ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
                  />
                </div>

                {/* TRC20 Wallet Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-green-400" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-lg font-semibold text-white">TRC20 Cüzdan</h2>
                      <p className="text-slate-400 text-sm">Ödeme bilgileriniz - Nakit ürünler için gerekli</p>
                    </div>
                    {userData.walletAddress && !editingWallet && (
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    )}
                  </div>

                  {!editingWallet ? (
                    <div className="space-y-3">
                      {userData.walletAddress ? (
                        <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3">
                          <p className="text-slate-500 text-xs mb-1">Kayıtlı Adres</p>
                          <p className="text-white font-mono text-sm break-all">{userData.walletAddress}</p>
                        </div>
                      ) : (
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-start gap-2">
                          <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-yellow-400 text-sm font-medium">Cüzdan adresi eklenmemiş</p>
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button
                          onClick={() => setEditingWallet(true)}
                          size="sm"
                          className="flex-1 bg-blue-600 hover:bg-blue-700"
                        >
                          <Edit2 className="w-4 h-4 mr-2" />
                          {userData.walletAddress ? 'Düzenle' : 'Ekle'}
                        </Button>
                        {userData.walletAddress && (
                          <Button
                            onClick={deleteWallet}
                            size="sm"
                            variant="outline"
                            className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <Label className="text-slate-300 text-sm mb-2 block">TRC20 Cüzdan Adresi</Label>
                        <Input
                          value={walletInput}
                          onChange={(e) => setWalletInput(e.target.value)}
                          placeholder="T ile başlayan 34 karakter"
                          className="bg-slate-900/50 border-slate-700 text-white"
                          maxLength={34}
                        />
                        <p className="text-slate-500 text-xs mt-1">Örn: TYs7Kza9mCTUF5JMi1234567890abcdefgh</p>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={saveWallet} size="sm" className="flex-1 bg-green-600 hover:bg-green-700">
                          <Save className="w-4 h-4 mr-2" />
                          Kaydet
                        </Button>
                        <Button
                          onClick={() => {
                            setEditingWallet(false)
                            setWalletInput(userData.walletAddress || '')
                          }}
                          size="sm"
                          variant="outline"
                          className="border-slate-600 text-slate-300 hover:bg-slate-800"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="border-t border-slate-700"></div>

                {/* Sponsor Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-lg font-semibold text-white">Sponsor Bilgileri</h2>
                      <p className="text-slate-400 text-sm">
                        {sponsorInfos.length} / {allSponsors.length} sponsor eklenmiş
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {allSponsors
                      .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map(sponsor => {
                        const userInfo = sponsorInfos.find(info => info.sponsor.id === sponsor.id)
                        const isEditing = editingSponsor === sponsor.id

                        return (
                          <div key={sponsor.id} className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                            {!isEditing ? (
                              <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                  {sponsor.logoUrl ? (
                                    <img
                                      src={sponsor.logoUrl}
                                      alt={sponsor.name}
                                      className="w-12 h-12 object-contain rounded-lg bg-white/5 p-2"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                      <Building2 className="w-6 h-6 text-purple-400" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-white text-sm font-medium truncate">{sponsor.name}</p>
                                    {userInfo ? (
                                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs mt-1">
                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                        Kayıtlı
                                      </Badge>
                                    ) : (
                                      <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs mt-1">
                                        Eksik
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                {userInfo && (
                                  <p className="text-slate-400 text-xs break-all">{getIdentifierLabel(sponsor.identifierType)}: {userInfo.identifier}</p>
                                )}
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => {
                                      setEditingSponsor(sponsor.id)
                                      setSponsorInput(userInfo?.identifier || '')
                                    }}
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 h-8 text-xs border-slate-600 hover:bg-slate-800"
                                  >
                                    <Edit2 className="w-3 h-3 mr-1" />
                                    {userInfo ? 'Düzenle' : 'Ekle'}
                                  </Button>
                                  {userInfo && (
                                    <Button
                                      onClick={() => deleteSponsorInfo(sponsor.id)}
                                      size="sm"
                                      variant="outline"
                                      className="h-8 text-xs border-red-500/50 text-red-400 hover:bg-red-500/20"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  {sponsor.logoUrl ? (
                                    <img
                                      src={sponsor.logoUrl}
                                      alt={sponsor.name}
                                      className="w-10 h-10 object-contain rounded-lg bg-white/5 p-1"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                                      <Building2 className="w-5 h-5 text-purple-400" />
                                    </div>
                                  )}
                                  <p className="text-white text-sm font-medium truncate">{sponsor.name}</p>
                                </div>
                                <Input
                                  value={sponsorInput}
                                  onChange={(e) => setSponsorInput(e.target.value)}
                                  placeholder={getIdentifierLabel(sponsor.identifierType)}
                                  className="h-8 text-sm bg-slate-800 border-slate-600 text-white"
                                />
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => saveSponsorInfo(sponsor.id)}
                                    size="sm"
                                    className="flex-1 h-8 text-xs bg-green-600 hover:bg-green-700"
                                  >
                                    <Save className="w-3 h-3 mr-1" />
                                    Kaydet
                                  </Button>
                                  <Button
                                    onClick={() => {
                                      setEditingSponsor(null)
                                      setSponsorInput('')
                                    }}
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs border-slate-600 hover:bg-slate-800"
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="history" className="mt-0 space-y-3">
                {!userData.pointHistory || userData.pointHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <History className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">Henüz puan geçmişi yok</p>
                  </div>
                ) : (
                  userData.pointHistory.slice(0, 10).map(history => {
                    const isPositive = history.amount > 0
                    let iconBg = 'bg-slate-500/20'
                    let Icon = History
                    let iconColor = 'text-slate-400'

                    switch(history.type) {
                      case 'wheel_win':
                        Icon = Star
                        iconBg = 'bg-purple-500/20'
                        iconColor = 'text-purple-400'
                        break
                      case 'shop_purchase':
                        Icon = ShoppingBag
                        iconBg = 'bg-red-500/20'
                        iconColor = 'text-red-400'
                        break
                      case 'task_reward':
                        Icon = CheckCircle2
                        iconBg = 'bg-emerald-500/20'
                        iconColor = 'text-emerald-400'
                        break
                      case 'referral_reward':
                        Icon = Users
                        iconBg = 'bg-blue-500/20'
                        iconColor = 'text-blue-400'
                        break
                    }

                    return (
                      <Card key={history.id} className="bg-slate-900/50 border-slate-700 p-4 hover:bg-slate-900/70 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
                            <Icon className={`w-6 h-6 ${iconColor}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-white text-sm mb-1">{history.description}</h3>
                            <p className="text-slate-500 text-xs">
                              {new Date(history.createdAt).toLocaleDateString('tr-TR', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className={`text-2xl font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                              {isPositive ? '+' : ''}{history.amount}
                            </p>
                          </div>
                        </div>
                      </Card>
                    )
                  })
                )}
              </TabsContent>

              <TabsContent value="purchases" className="mt-0 space-y-3">
                {purchases.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingBag className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">Henüz satın alım yapılmamış</p>
                  </div>
                ) : (
                  purchases.map(purchase => (
                    <Card key={purchase.id} className="bg-slate-900/50 border-slate-700 p-4 hover:bg-slate-900/70 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                          <ShoppingBag className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-white text-sm mb-1">{purchase.item.name}</h3>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-500">
                              {new Date(purchase.purchasedAt).toLocaleDateString('tr-TR')}
                            </span>
                            <span className="text-yellow-400">• {purchase.pointsSpent} puan</span>
                          </div>
                        </div>
                        <Badge className={`${getStatusColor(purchase.status)} flex items-center gap-1 flex-shrink-0`}>
                          {getStatusIcon(purchase.status)}
                          <span className="hidden sm:inline">{purchase.status}</span>
                        </Badge>
                      </div>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="ranks" className="mt-0 space-y-3">
                {!userData.allRanks || userData.allRanks.length === 0 ? (
                  <div className="text-center py-12">
                    <Crown className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">Rütbe bilgisi bulunamadı</p>
                  </div>
                ) : (
                  userData.allRanks.map(rank => {
                    const isCurrentRank = userData.rank?.minXp === rank.minXp
                    const isCompleted = (userData.xp || 0) >= rank.minXp
                    const isNextRank = userData.nextRank?.minXp === rank.minXp

                    return (
                      <Card
                        key={rank.id}
                        className={`p-4 transition-all ${
                          isCurrentRank
                            ? 'bg-gradient-to-br from-yellow-600/30 to-orange-600/30 border-yellow-500/50 shadow-lg scale-105'
                            : isCompleted
                            ? 'bg-slate-900/50 border-slate-700'
                            : 'bg-slate-900/30 border-slate-700 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isCurrentRank
                              ? 'bg-yellow-500/20 border-2 border-yellow-500/50'
                              : isCompleted
                              ? 'bg-green-500/20 border-2 border-green-500/30'
                              : 'bg-slate-700/50 border-2 border-slate-600'
                          }`}>
                            <span className="text-3xl">{rank.icon}</span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className={`font-bold text-lg ${isCurrentRank ? 'text-yellow-300' : 'text-white'}`}>
                                {rank.name}
                              </h4>
                              {isCurrentRank && (
                                <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 text-xs">
                                  Mevcut
                                </Badge>
                              )}
                              {isNextRank && !isCurrentRank && (
                                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
                                  Sonraki
                                </Badge>
                              )}
                            </div>
                            <p className="text-slate-400 text-sm">
                              {rank.minXp.toLocaleString('tr-TR')} XP
                              {isNextRank && ` • ${rank.minXp - (userData.xp || 0)} XP kaldı`}
                            </p>
                          </div>

                          {isCompleted && (
                            <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0" />
                          )}
                        </div>

                        {isCurrentRank && userData.nextRank && (
                          <div className="mt-3 pt-3 border-t border-yellow-500/30">
                            <div className="flex justify-between text-xs mb-2">
                              <span className="text-yellow-300">İlerleme</span>
                              <span className="text-yellow-400 font-bold">{Math.round(xpProgress)}%</span>
                            </div>
                            <Progress value={xpProgress} className="h-2 bg-slate-700" />
                          </div>
                        )}
                      </Card>
                    )
                  })
                )}
              </TabsContent>
            </div>
          </Tabs>
        </Card>
      </div>

      {/* Telegram Disconnect Dialog */}
      <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Telegram Bağlantısını Kopar</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Telegram hesabınızın bağlantısını koparmak istediğinize emin misiniz?
              <br /><br />
              <strong className="text-yellow-400">Uyarı:</strong> Başka bir Telegram hesabı bağlayabilirsiniz,
              ancak bağlantıyı kopardıktan sonra <strong>1 gün boyunca</strong> tekrar bağlantı yapamazsınız.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setShowDisconnectDialog(false)}
              className="bg-slate-700 text-white border-slate-600 hover:bg-slate-600"
            >
              İptal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={disconnectTelegram}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Bağlantıyı Kopar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}

export default function ProfilePage() {
  return (
    <ProtectedRoute requireAuth={true}>
      <DashboardLayout>
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        }>
          <ProfileContent />
        </Suspense>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
