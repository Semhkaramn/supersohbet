'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import DashboardLayout from '@/components/DashboardLayout'
import ProtectedRoute from '@/components/ProtectedRoute'
import {
  Users,
  Gift,
  Copy,
  Check,
  Share2,
  Star,
  ArrowRight,
  Trophy
} from 'lucide-react'
import { toast } from 'sonner'

interface ReferralData {
  referralCode: string
  referralLink: string
  totalReferrals: number
  referralPoints: number
  bonusInviter: number
  bonusInvited: number
  referrals: Array<{
    id: string
    firstName?: string
    username?: string
    photoUrl?: string
    points: number
    xp: number
    createdAt: string
  }>
  referredBy?: {
    id: string
    firstName?: string
    username?: string
    photoUrl?: string
  }
}

function ReferralContent() {
  const router = useRouter()
  const { setShowLoginModal } = useAuth()

  const [referralData, setReferralData] = useState<ReferralData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    loadReferralData()
  }, [])

  async function loadReferralData() {
    try {
      const response = await fetch('/api/referral/info')

      if (response.status === 401) {
        // Session expired, show login modal
        setShowLoginModal(true)
        return
      }

      const data = await response.json()
      setReferralData(data)
    } catch (error) {
      console.error('Error loading referral data:', error)
      toast.error('Referans bilgileri yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  async function copyLink() {
    if (!referralData) return

    try {
      await navigator.clipboard.writeText(referralData.referralLink)
      setCopied(true)
      toast.success('Referans linki kopyalandı!')
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error('Link kopyalanamadı')
    }
  }

  async function shareLink() {
    if (!referralData) return

    const shareText = `🎁 Beni takip et ve ödül kazan!\n\n${referralData.bonusInvited} puan bonus al!\n\n${referralData.referralLink}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'SüperSohbet\'e katıl!',
          text: shareText
        })
      } catch (error) {
        console.log('Share cancelled')
      }
    } else {
      copyLink()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!referralData) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center">
          <p className="text-red-400">Referans bilgileri yüklenemedi</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-yellow-300" />
              <span className="text-white/80 text-sm">Davetler</span>
            </div>
            <p className="text-3xl font-bold text-white">{referralData.totalReferrals}</p>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Gift className="w-5 h-5 text-yellow-300" />
              <span className="text-white/80 text-sm">Kazanç</span>
            </div>
            <p className="text-3xl font-bold text-white">{referralData.referralPoints}</p>
          </Card>
        </div>
        {/* Referral Link Card */}
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 p-5">
          <h3 className="font-bold text-white mb-1 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-blue-400" />
            Davet Linkin
          </h3>
          <p className="text-slate-400 text-sm mb-4">Bu linki arkadaşlarınla paylaş</p>

          <div className="bg-slate-900/50 rounded-lg p-3 mb-3 border border-slate-700">
            <p className="text-blue-400 text-sm break-all font-mono">{referralData.referralLink}</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={copyLink}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? 'Kopyalandı!' : 'Kopyala'}
            </Button>
            <Button
              onClick={shareLink}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Paylaş
            </Button>
          </div>
        </Card>

        {/* Bonus Info */}
        <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30 p-5">
          <h3 className="font-bold text-white mb-3 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            Ödül Sistemi
          </h3>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <Gift className="w-5 h-5 text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-white text-sm font-semibold">Davet edilen kişi</p>
                <p className="text-slate-400 text-xs">+{referralData.bonusInvited} puan bonus alır</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Star className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-white text-sm font-semibold">Davet eden (sen)</p>
                <p className="text-slate-400 text-xs">+{referralData.bonusInviter} puan kazanırsın</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Nasıl Çalışır? */}
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 p-5">
          <h3 className="font-bold text-white mb-4 flex items-center gap-2">
            <span className="text-xl">ℹ️</span>
            Nasıl Çalışır?
          </h3>

          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-400 text-sm">1</span>
              </div>
              <p className="text-slate-300 text-sm">
                Referans linkinizi arkadaşlarınızla paylaşın
              </p>
            </div>

            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-400 text-sm">2</span>
              </div>
              <p className="text-slate-300 text-sm">
                Arkadaşlarınız linke tıklayıp bota katıldığında puan kazanın
              </p>
            </div>

            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-400 text-sm">3</span>
              </div>
              <p className="text-slate-300 text-sm">
                Belirli sayıda üye getirdiğinizde bonus ödüller alın
              </p>
            </div>

            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-400 text-sm">4</span>
              </div>
              <p className="text-slate-300 text-sm">
                Ödüller otomatik olarak hesabınıza eklenir
              </p>
            </div>
          </div>
        </Card>

        {/* Referred By */}
        {referralData.referredBy && (
          <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 p-4">
            <p className="text-slate-400 text-xs mb-2">Seni davet eden</p>
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 border-2 border-purple-500/30">
                {referralData.referredBy.photoUrl && <AvatarImage src={referralData.referredBy.photoUrl} alt={referralData.referredBy.firstName || referralData.referredBy.username || 'User'} />}
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white text-sm">
                  {referralData.referredBy.firstName?.[0] || referralData.referredBy.username?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-white font-semibold">
                  {referralData.referredBy.firstName || referralData.referredBy.username || 'Kullanıcı'}
                </p>
                <p className="text-slate-400 text-xs">Teşekkürler! 💜</p>
              </div>
            </div>
          </Card>
        )}

        {/* Referrals List */}
        {referralData.referrals.length > 0 && (
          <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 p-5">
            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-400" />
              Davetlilerim ({referralData.totalReferrals})
            </h3>

            <div className="space-y-3">
              {referralData.referrals.slice(0, 10).map((referral) => (
                <div
                  key={referral.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50 border border-slate-700"
                >
                  <Avatar className="w-10 h-10 border-2 border-blue-500/30">
                    {referral.photoUrl && <AvatarImage src={referral.photoUrl} alt={referral.firstName || referral.username || 'User'} />}
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-sm">
                      {referral.firstName?.[0] || referral.username?.[0] || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-white font-semibold text-sm">
                      {referral.firstName || referral.username || 'Kullanıcı'}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-yellow-400 text-xs">{referral.points} puan</span>
                      <span className="text-purple-400 text-xs">{referral.xp} XP</span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500" />
                </div>
              ))}
            </div>

            {referralData.totalReferrals > 10 && (
              <p className="text-slate-400 text-center text-xs mt-4">
                +{referralData.totalReferrals - 10} kişi daha
              </p>
            )}
          </Card>
        )}

        {referralData.referrals.length === 0 && (
          <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 p-8">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                <Users className="w-10 h-10 text-blue-400" />
              </div>
              <h3 className="text-white font-bold mb-2">Henüz davet etmedin</h3>
              <p className="text-slate-400 text-sm mb-4">
                Arkadaşlarını davet et ve her davet için {referralData.bonusInviter} puan kazan!
              </p>
              <Button
                onClick={shareLink}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Davet Gönder
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

export default function ReferralPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        }>
          <ReferralContent />
        </Suspense>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
