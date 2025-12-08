'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import BottomNav from '@/components/BottomNav'
import { Ticket, Gift, TrendingUp, Trophy } from 'lucide-react'
import { toast } from 'sonner'

interface WheelPrize {
  id: string
  name: string
  points: number
  color: string
  order: number
}

interface UserData {
  dailySpinsLeft: number
}

interface RecentWinner {
  id: string
  user: {
    firstName?: string
    username?: string
  }
  prize: {
    name: string
  }
  pointsWon: number
  spunAt: string
}

function WheelContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const userId = searchParams.get('userId')

  const [prizes, setPrizes] = useState<WheelPrize[]>([])
  const [userData, setUserData] = useState<UserData | null>(null)
  const [recentWinners, setRecentWinners] = useState<RecentWinner[]>([])
  const [spinning, setSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      router.push('/')
      return
    }
    loadData()
  }, [userId])

  async function loadData() {
    try {
      const [prizesRes, userRes, winnersRes] = await Promise.all([
        fetch('/api/wheel/prizes'),
        fetch(`/api/user/${userId}`),
        fetch('/api/wheel/recent-winners')
      ])

      const prizesData = await prizesRes.json()
      const userData = await userRes.json()
      const winnersData = await winnersRes.json()

      setPrizes(prizesData.prizes || [])
      setUserData(userData)
      setRecentWinners(winnersData.winners || [])
    } catch (error) {
      console.error('Error loading wheel data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function spinWheel() {
    if (!userData || userData.dailySpinsLeft <= 0) {
      toast.error('Günlük çark hakkınız kalmadı!')
      return
    }

    setSpinning(true)

    try {
      const response = await fetch('/api/wheel/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })

      const data = await response.json()

      if (data.success) {
        const prizeIndex = data.prizeIndex

        // Profesyonel çark hesaplaması
        // Her segment kaç derece?
        const segmentAngle = 360 / prizes.length

        // Kazanan segment'in başlangıç açısı (SVG -90°'den başlıyor)
        const prizeStartAngle = -90 + (prizeIndex * segmentAngle)

        // Segment'in ortasını bul
        const prizeMidAngle = prizeStartAngle + (segmentAngle / 2)

        // Ok üstte (-90°) sabit, kazanan dilimi ok altına getir
        // Çarkı saat yönünde döndüreceğiz
        let targetAngle = -90 - prizeMidAngle

        // Açıyı normalize et (pozitif yap)
        while (targetAngle < 0) {
          targetAngle += 360
        }
        targetAngle = targetAngle % 360

        // 5-10 tam tur random
        const randomSpins = 5 + Math.floor(Math.random() * 5)

        // Toplam rotasyon
        const totalRotation = (randomSpins * 360) + targetAngle

        // Animasyonu başlat
        setRotation(totalRotation)

        // 4 saniye sonra sonuç göster
        setTimeout(() => {
          toast.success(`🎉 Tebrikler! ${data.pointsWon} puan kazandınız!`)
          setSpinning(false)
          loadData()
        }, 4000)
      } else {
        toast.error(data.error || 'Çark çevrilemedi')
        setSpinning(false)
      }
    } catch (error) {
      console.error('Spin error:', error)
      toast.error('Bir hata oluştu')
      setSpinning(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  const segmentAngle = 360 / (prizes.length || 8)

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 to-indigo-600 p-4">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-xl font-bold text-white flex items-center justify-center gap-2">
            <Ticket className="w-5 h-5" />
            Şans Çarkı
          </h1>
        </div>
      </div>

      {/* Wheel Section */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Spin Info */}
        <div className="text-center mb-6">
          <p className="text-green-400 font-semibold text-sm mb-1">✨ Tamamen Ücretsiz</p>
          {userData && (
            <p className="text-white/60 text-xs">
              Kalan hak: {userData.dailySpinsLeft} çevirme
            </p>
          )}
        </div>

        {/* Wheel */}
        <div className="relative mb-6">
          <div className="relative w-80 h-80 mx-auto">
            {/* Arrow Pointer */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 z-10">
              <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[35px] border-t-white drop-shadow-2xl"></div>
            </div>

            {/* Wheel Container with border */}
            <div className="w-full h-full rounded-full border-8 border-white shadow-2xl relative overflow-hidden bg-slate-900">
              {/* Spinning wheel */}
              <svg
                viewBox="0 0 200 200"
                className="w-full h-full"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: spinning ? 'transform 4s cubic-bezier(0.25, 0.1, 0.25, 1)' : 'none'
                }}
              >
                {prizes.map((prize, index) => {
                  const startAngle = index * segmentAngle - 90
                  const endAngle = (index + 1) * segmentAngle - 90
                  const midAngle = (startAngle + endAngle) / 2

                  // Calculate path for segment
                  const startX = 100 + 100 * Math.cos((startAngle * Math.PI) / 180)
                  const startY = 100 + 100 * Math.sin((startAngle * Math.PI) / 180)
                  const endX = 100 + 100 * Math.cos((endAngle * Math.PI) / 180)
                  const endY = 100 + 100 * Math.sin((endAngle * Math.PI) / 180)

                  // Calculate text position
                  const textRadius = 65
                  const textX = 100 + textRadius * Math.cos((midAngle * Math.PI) / 180)
                  const textY = 100 + textRadius * Math.sin((midAngle * Math.PI) / 180)

                  return (
                    <g key={prize.id}>
                      {/* Segment */}
                      <path
                        d={`M 100 100 L ${startX} ${startY} A 100 100 0 0 1 ${endX} ${endY} Z`}
                        fill={prize.color}
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="0.5"
                      />

                      {/* Text */}
                      <text
                        x={textX}
                        y={textY}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="white"
                        fontWeight="bold"
                        fontSize="10"
                        style={{
                          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
                          transform: `rotate(${midAngle + 90}deg)`,
                          transformOrigin: `${textX}px ${textY}px`
                        }}
                      >
                        <tspan x={textX} dy="-6">{prize.name}</tspan>
                        <tspan x={textX} dy="12" fontSize="12" fontWeight="900">{prize.points}</tspan>
                      </text>
                    </g>
                  )
                })}
              </svg>

              {/* Center Circle */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-gradient-to-br from-yellow-400 via-orange-400 to-orange-500 rounded-full border-4 border-white flex items-center justify-center shadow-2xl">
                <Gift className="w-10 h-10 text-white drop-shadow-lg" />
              </div>
            </div>
          </div>
        </div>

        {/* Spin Button */}
        <Button
          onClick={spinWheel}
          disabled={spinning || !userData || userData.dailySpinsLeft <= 0}
          className="w-full bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:via-indigo-700 hover:to-blue-700 text-white font-bold py-6 text-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-xl"
        >
          {spinning ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Çark Dönüyor...
            </>
          ) : userData && userData.dailySpinsLeft > 0 ? (
            <>
              <TrendingUp className="w-6 h-6 mr-2" />
              Çarkı Çevir
            </>
          ) : (
            'Günlük Hakkınız Kalmadı'
          )}
        </Button>

        {/* Recent Wins */}
        <div className="mt-8">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            Son Kazananlar
          </h3>
          {recentWinners.length === 0 ? (
            <Card className="bg-slate-800/50 border-slate-700 p-6 text-center">
              <p className="text-slate-400 text-sm">Henüz kazanan yok</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {recentWinners.map((winner) => (
                <Card key={winner.id} className="bg-slate-800/80 border-slate-700 p-3 hover:bg-slate-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 border-2 border-yellow-400/50">
                      <AvatarFallback className="bg-gradient-to-br from-yellow-500 to-orange-500 text-white font-bold text-sm">
                        {winner.user.firstName?.[0] || winner.user.username?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-white font-semibold text-sm">
                        {winner.user.firstName || winner.user.username || 'Kullanıcı'}
                      </p>
                      <p className="text-slate-400 text-xs">{winner.prize.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-yellow-400 font-bold text-lg">+{winner.pointsWon}</p>
                      <p className="text-slate-500 text-xs">
                        {new Date(winner.spunAt).toLocaleDateString('tr-TR', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav userId={userId!} />
    </div>
  )
}

export default function WheelPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <WheelContent />
    </Suspense>
  )
}
