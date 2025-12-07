'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import BottomNav from '@/components/BottomNav'
import { Ticket, Gift, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'

interface WheelPrize {
  id: string
  name: string
  points: number
  color: string
}

interface UserData {
  dailySpinsLeft: number
}

function WheelContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const userId = searchParams.get('userId')

  const [prizes, setPrizes] = useState<WheelPrize[]>([])
  const [userData, setUserData] = useState<UserData | null>(null)
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
      const [prizesRes, userRes] = await Promise.all([
        fetch('/api/wheel/prizes'),
        fetch(`/api/user/${userId}`)
      ])

      const prizesData = await prizesRes.json()
      const userData = await userRes.json()

      setPrizes(prizesData.prizes || [])
      setUserData(userData)
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
        // Çarkı döndür
        const randomSpins = 5 + Math.random() * 3 // 5-8 tam tur
        const prizeIndex = prizes.findIndex(p => p.id === data.prizeId)
        const prizeAngle = (360 / prizes.length) * prizeIndex
        const finalRotation = rotation + (randomSpins * 360) + prizeAngle

        setRotation(finalRotation)

        // Animasyon bitince sonucu göster
        setTimeout(() => {
          toast.success(`🎉 Tebrikler! ${data.pointsWon} puan kazandınız!`)
          setSpinning(false)
          loadData() // Verileri yenile
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

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 to-pink-600 p-4">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-xl font-bold text-white flex items-center justify-center gap-2">
            <Ticket className="w-5 h-5" />
            Şans Çarkı
          </h1>
        </div>
      </div>

      {/* Wheel Section */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Spin Info - Minimal */}
        <div className="text-center mb-6">
          <p className="text-green-400 font-semibold text-sm mb-1">✨ Ücretsiz</p>
          {userData && (
            <p className="text-white/60 text-xs">
              Kalan hak: {userData.dailySpinsLeft} çevirme
            </p>
          )}
        </div>

        {/* Wheel - Küçültülmüş */}
        <div className="relative mb-6">
          <div className="relative w-64 h-64 mx-auto">
            {/* Arrow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
              <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[25px] border-t-white drop-shadow-lg"></div>
            </div>

            {/* Wheel Circle */}
            <div
              className="w-full h-full rounded-full border-6 border-white shadow-2xl relative overflow-hidden"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: spinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none'
              }}
            >
              {prizes.map((prize, index) => {
                const angle = (360 / prizes.length) * index
                return (
                  <div
                    key={prize.id}
                    className="absolute w-full h-full flex items-center justify-center"
                    style={{
                      transform: `rotate(${angle}deg)`,
                      background: `conic-gradient(from ${angle}deg, ${prize.color} 0deg, ${prize.color} ${360 / prizes.length}deg, transparent ${360 / prizes.length}deg)`
                    }}
                  >
                    <div
                      className="absolute top-6 text-white font-bold text-center"
                      style={{ transform: `rotate(${90 - angle}deg)` }}
                    >
                      <div className="text-xs">{prize.name}</div>
                      <div className="text-sm">{prize.points}</div>
                    </div>
                  </div>
                )
              })}

              {/* Center Circle */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full border-4 border-white flex items-center justify-center shadow-lg">
                <Gift className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Spin Button */}
        <Button
          onClick={spinWheel}
          disabled={spinning || !userData || userData.dailySpinsLeft <= 0}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-6 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
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

        {/* Recent Wins - Gerçek veri gelene kadar boş */}
        <div className="mt-8">
          <h3 className="text-lg font-bold text-white mb-3">Son Kazananlar</h3>
          <div className="text-center py-8 text-white/40 text-sm">
            Henüz kazanan yok
          </div>
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
