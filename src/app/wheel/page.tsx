'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import BottomNav from '@/components/BottomNav'
import { Ticket, Gift, TrendingUp, Trophy, Dices } from 'lucide-react'
import { toast } from 'sonner'

interface WheelPrize {
  id: string
  name: string
  points: number
  color: string
  order: number
}

interface SlotPrize {
  id: string
  name: string
  symbol: string
  points: number
  color: string
  chance: number
  isActive: boolean
}

interface UserData {
  dailySpinsLeft: number
  dailySlotSpinsLeft: number
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

interface SlotWinner {
  id: string
  user: {
    firstName?: string
    username?: string
  }
  prize?: {
    name: string
    symbol: string
  }
  symbols: string
  pointsWon: number
  spunAt: string
}

function GamesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const userId = searchParams.get('userId')

  // Wheel state
  const [prizes, setPrizes] = useState<WheelPrize[]>([])
  const [recentWinners, setRecentWinners] = useState<RecentWinner[]>([])
  const [spinning, setSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)

  // Slot machine state
  const [slotPrizes, setSlotPrizes] = useState<SlotPrize[]>([])
  const [slotWinners, setSlotWinners] = useState<SlotWinner[]>([])
  const [slotSpinning, setSlotSpinning] = useState(false)
  const [reels, setReels] = useState<string[]>(['🍒', '🍋', '🍇'])
  const [leverPulled, setLeverPulled] = useState(false)
  const [reelPositions, setReelPositions] = useState([0, 0, 0])
  const [hoursUntilReset, setHoursUntilReset] = useState(0)

  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)

  // Available symbols - only 4
  const symbols = ['7️⃣', '🍒', '🍇', '🍋']

  useEffect(() => {
    if (!userId) {
      router.push('/')
      return
    }
    loadData()
  }, [userId])

  async function loadData() {
    try {
      const [prizesRes, slotPrizesRes, userRes, winnersRes, slotWinnersRes] = await Promise.all([
        fetch('/api/wheel/prizes'),
        fetch('/api/slot-machine/prizes'),
        fetch(`/api/user/${userId}`),
        fetch('/api/wheel/recent-winners'),
        fetch('/api/slot-machine/spin')
      ])

      const prizesData = await prizesRes.json()
      const slotPrizesData = await slotPrizesRes.json()
      const userData = await userRes.json()
      const winnersData = await winnersRes.json()
      const slotWinnersData = await slotWinnersRes.json()

      setPrizes(prizesData.prizes || [])
      setSlotPrizes(slotPrizesData.prizes || [])
      setUserData(userData)
      setRecentWinners(winnersData.winners || [])
      setSlotWinners(slotWinnersData.winners || [])
    } catch (error) {
      console.error('Error loading games data:', error)
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
        const segmentAngle = 360 / prizes.length
        const prizeStartAngle = -90 + (prizeIndex * segmentAngle)
        const prizeMidAngle = prizeStartAngle + (segmentAngle / 2)
        let targetAngle = -90 - prizeMidAngle

        while (targetAngle < 0) {
          targetAngle += 360
        }
        targetAngle = targetAngle % 360

        const randomSpins = 5 + Math.floor(Math.random() * 5)
        const totalRotation = (randomSpins * 360) + targetAngle

        setRotation(totalRotation)

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

  async function spinSlot() {
    if (!userData || userData.dailySlotSpinsLeft <= 0) {
      toast.error('Günlük slot makinesi hakkınız kalmadı!')
      return
    }

    setSlotSpinning(true)
    setLeverPulled(true)

    // Lever animation - pull down
    setTimeout(() => setLeverPulled(false), 500)

    // Start reel spinning animation
    const spinDurations = [2000, 2500, 3000] // Each reel stops at different times

    try {
      const response = await fetch('/api/slot-machine/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })

      const data = await response.json()

      if (data.success) {
        // Spin each reel with realistic animation
        spinDurations.forEach((duration, index) => {
          let elapsed = 0
          const interval = 50

          const spinInterval = setInterval(() => {
            elapsed += interval
            const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)]
            setReels(prev => {
              const newReels = [...prev]
              newReels[index] = randomSymbol
              return newReels
            })
            setReelPositions(prev => {
              const newPos = [...prev]
              newPos[index] = (newPos[index] + 1) % 20
              return newPos
            })

            if (elapsed >= duration) {
              clearInterval(spinInterval)
              // Set final symbol for this reel
              setReels(prev => {
                const newReels = [...prev]
                newReels[index] = data.symbols[index]
                return newReels
              })
              setReelPositions(prev => {
                const newPos = [...prev]
                newPos[index] = 0
                return newPos
              })
            }
          }, interval)
        })

        // Wait for all reels to stop
        setTimeout(() => {
          setSlotSpinning(false)

          if (data.isWin) {
            toast.success(`🎰 KAZANDINIZ! ${data.prizeName} - ${data.pointsWon} puan!`, {
              duration: 5000
            })
          } else if (data.isMatch) {
            toast.warning('🎰 3 aynı geldi ama bu sembol için ödül tanımlanmamış!', {
              duration: 4000
            })
          } else {
            toast.info('Tekrar deneyin! 🎲')
          }

          // Günlük reset süresini güncelle
          if (data.hoursUntilReset !== undefined) {
            setHoursUntilReset(data.hoursUntilReset)
          }

          loadData()
        }, spinDurations[2] + 500)
      } else {
        toast.error(data.error || 'Çevirme başarısız')
        setSlotSpinning(false)
        setLeverPulled(false)
      }
    } catch (error) {
      console.error('Slot spin error:', error)
      toast.error('Bir hata oluştu')
      setSlotSpinning(false)
      setLeverPulled(false)
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
            <Dices className="w-5 h-5" />
            Oyunlar
          </h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4">
        <Tabs defaultValue="wheel" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="wheel" className="flex items-center gap-2">
              <Ticket className="w-4 h-4" />
              Şans Çarkı
            </TabsTrigger>
            <TabsTrigger value="slot" className="flex items-center gap-2">
              <Dices className="w-4 h-4" />
              Slot Makinesi
            </TabsTrigger>
          </TabsList>

          {/* WHEEL TAB */}
          <TabsContent value="wheel" className="space-y-6">
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

                      const startX = 100 + 100 * Math.cos((startAngle * Math.PI) / 180)
                      const startY = 100 + 100 * Math.sin((startAngle * Math.PI) / 180)
                      const endX = 100 + 100 * Math.cos((endAngle * Math.PI) / 180)
                      const endY = 100 + 100 * Math.sin((endAngle * Math.PI) / 180)

                      const textRadius = 65
                      const textX = 100 + textRadius * Math.cos((midAngle * Math.PI) / 180)
                      const textY = 100 + textRadius * Math.sin((midAngle * Math.PI) / 180)

                      return (
                        <g key={prize.id}>
                          <path
                            d={`M 100 100 L ${startX} ${startY} A 100 100 0 0 1 ${endX} ${endY} Z`}
                            fill={prize.color}
                            stroke="rgba(255,255,255,0.1)"
                            strokeWidth="0.5"
                          />
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
          </TabsContent>

          {/* SLOT MACHINE TAB */}
          <TabsContent value="slot" className="space-y-6">
            {/* Slot Info */}
            <div className="text-center mb-6">
              <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-xl p-3 mb-3">
                <p className="text-white font-semibold text-sm mb-1">🎰 Tamamen Rastgele!</p>
                <p className="text-white/70 text-xs">
                  Her makarada farklı semboller gelebilir
                </p>
                <p className="text-green-400 text-xs font-semibold mt-1">
                  3 aynı gelirse ve ödül varsa kazanırsınız!
                </p>
              </div>
              {userData && (
                <>
                  <p className="text-white/60 text-xs">
                    Kalan hak: {userData.dailySlotSpinsLeft} çevirme
                  </p>
                  {userData.dailySlotSpinsLeft === 0 && hoursUntilReset > 0 && (
                    <p className="text-yellow-400 text-xs mt-1 font-semibold">
                      ⏰ {hoursUntilReset} saat sonra yenilenecek
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Slot Machine Container */}
            <div className="relative max-w-md mx-auto">
              {/* Machine Body */}
              <div className="relative bg-gradient-to-b from-red-600 via-red-500 to-red-700 rounded-3xl p-6 shadow-2xl border-8 border-yellow-400">
                {/* Top decoration */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-24 h-8 bg-yellow-400 rounded-t-xl border-4 border-yellow-500"></div>

                {/* Jackpot Display */}
                <div className="bg-black/30 rounded-xl p-3 mb-4 text-center border-4 border-yellow-300">
                  <div className="text-yellow-300 font-black text-2xl tracking-wider animate-pulse">
                    🎰 SLOT MACHINE 🎰
                  </div>
                </div>

                {/* Screen/Reels Container */}
                <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl p-6 border-8 border-yellow-500 shadow-inner relative overflow-hidden">
                  {/* Reflection effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>

                  {/* Reels */}
                  <div className="grid grid-cols-3 gap-3 relative z-10">
                    {reels.map((symbol, index) => (
                      <div key={index} className="relative">
                        {/* Reel container */}
                        <div className="aspect-square bg-white rounded-xl flex items-center justify-center border-4 border-slate-700 shadow-lg overflow-hidden relative">
                          {/* Spinning effect */}
                          <div
                            className={`absolute inset-0 flex flex-col items-center justify-center transition-transform ${
                              slotSpinning ? 'animate-spin-reel' : ''
                            }`}
                            style={{
                              transform: slotSpinning ? `translateY(-${reelPositions[index] * 20}px)` : 'translateY(0)',
                              transition: slotSpinning ? 'none' : 'transform 0.3s ease-out'
                            }}
                          >
                            <div className="text-6xl">
                              {symbol}
                            </div>
                          </div>
                        </div>

                        {/* Win line indicator */}
                        {index === 1 && (
                          <>
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-yellow-400/50 pointer-events-none"></div>
                            <div className="absolute left-1/2 top-0 -translate-x-1/2 w-1 h-full bg-yellow-400/50 pointer-events-none"></div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom panel with lights */}
                <div className="mt-4 flex justify-center gap-2">
                  {[1,2,3,4,5].map((i) => (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded-full ${
                        slotSpinning ? 'bg-yellow-400 animate-pulse' : 'bg-yellow-600/50'
                      }`}
                    ></div>
                  ))}
                </div>

                {/* Spin Button */}
                <Button
                  onClick={spinSlot}
                  disabled={slotSpinning || !userData || userData.dailySlotSpinsLeft <= 0}
                  className="w-full mt-4 bg-gradient-to-r from-green-600 via-green-500 to-green-600 hover:from-green-700 hover:via-green-600 hover:to-green-700 text-white font-black py-6 text-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-xl border-4 border-yellow-300 rounded-xl transform active:scale-95 transition-transform"
                >
                  {slotSpinning ? (
                    <>
                      <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      ÇEVİRİLİYOR...
                    </>
                  ) : userData && userData.dailySlotSpinsLeft > 0 ? (
                    <>
                      <Dices className="w-7 h-7 mr-2" />
                      ÇEVİR!
                    </>
                  ) : (
                    'GÜNLÜK HAKKINIZ KALMADI'
                  )}
                </Button>
              </div>

              {/* Lever on the side */}
              <div className="absolute -right-6 top-1/4 flex flex-col items-center">
                <div
                  className={`w-4 h-32 bg-gradient-to-b from-red-700 to-red-900 rounded-full border-4 border-yellow-500 shadow-lg transform transition-transform duration-300 ${
                    leverPulled ? 'translate-y-8' : ''
                  }`}
                >
                  {/* Lever handle */}
                  <div className="absolute -top-2 -left-3 w-10 h-10 bg-gradient-to-br from-red-600 to-red-800 rounded-full border-4 border-yellow-400 shadow-xl"></div>
                </div>
              </div>
            </div>

            {/* Prize Info */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mt-6">
              <h3 className="text-white font-bold text-sm mb-3 text-center flex items-center justify-center gap-2">
                <span>💰</span> Ödül Tablosu <span>💰</span>
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                {symbols.map((symbol) => {
                  const prize = slotPrizes.find(p => p.symbol === symbol && p.isActive)
                  return (
                    <div key={symbol} className={`rounded-lg p-3 border text-center transition-all ${
                      prize
                        ? 'bg-gradient-to-br from-green-900/50 to-green-800/30 border-green-500/50 shadow-lg shadow-green-500/20'
                        : 'bg-slate-900/50 border-slate-700 opacity-60'
                    }`}>
                      <div className="text-4xl mb-2">{symbol}</div>
                      <div className="text-xs text-slate-300 mb-1 font-semibold">
                        {symbol === '7️⃣' ? 'Yedi' : symbol === '🍒' ? 'Kiraz' : symbol === '🍇' ? 'Üzüm' : 'Limon'}
                      </div>
                      <div className="text-xs font-mono mb-1 text-slate-500">
                        {symbol} {symbol} {symbol}
                      </div>
                      {prize ? (
                        <>
                          <div className="text-yellow-400 font-black text-sm">+{prize.points}</div>
                          <div className="text-green-400 text-xs">Puan</div>
                        </>
                      ) : (
                        <div className="text-red-400 text-xs font-semibold">Ödül Yok</div>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-2 text-center">
                <p className="text-blue-300 text-xs font-semibold">
                  ℹ️ Semboller tamamen rastgele gelir
                </p>
                <p className="text-slate-400 text-xs mt-1">
                  Örnek: 7️⃣ 🍒 🍋 veya 🍇 🍇 🍋 gelebilir - Kazanmak için 3 aynı gelmeli!
                </p>
              </div>
            </div>

            {/* Recent Wins */}
            <div className="mt-8">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                Son Kazananlar
              </h3>
              {slotWinners.length === 0 ? (
                <Card className="bg-slate-800/50 border-slate-700 p-6 text-center">
                  <p className="text-slate-400 text-sm">Henüz kazanan yok</p>
                </Card>
              ) : (
                <div className="space-y-2">
                  {slotWinners.map((winner) => (
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
                          <p className="text-slate-400 text-xs">{winner.symbols}</p>
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
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav userId={userId || ''} />

      <style jsx>{`
        @keyframes spin-reel {
          from { transform: translateY(0); }
          to { transform: translateY(-100%); }
        }
      `}</style>
    </div>
  )
}

export default function GamesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <GamesContent />
    </Suspense>
  )
}
