'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MaintenanceScreen } from '@/components/MaintenanceScreen'
import { BannedScreen } from '@/components/BannedScreen'

interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date?: number
  hash?: string
}

interface TelegramWebApp {
  ready: () => void
  expand: () => void
  initDataUnsafe: {
    user?: TelegramUser
    auth_date?: number
    hash?: string
  }
  initData: string
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp
    }
  }
}

function HomeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [debugInfo, setDebugInfo] = useState<string>('')
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [isBanned, setIsBanned] = useState(false)
  const [banInfo, setBanInfo] = useState<{ reason?: string; date?: string; by?: string }>({})

  useEffect(() => {
    const initTelegramApp = async () => {
      try {
        // Telegram WebApp API'yi kontrol et
        if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
          const tg = window.Telegram.WebApp
          tg.ready()
          tg.expand()

          setDebugInfo(`Telegram WebApp yüklendi. InitData: ${tg.initData ? 'Var' : 'Yok'}`)

          // URL'den gelen auth verilerini kontrol et
          const telegramData = searchParams.get('tg_data')

          if (telegramData) {
            try {
              const userData: TelegramUser = JSON.parse(decodeURIComponent(telegramData))
              await checkUserChannels(userData)
              return
            } catch (err) {
              console.error('URL auth error:', err)
            }
          }

          // Telegram WebApp'ten kullanıcı bilgilerini al
          const initData = tg.initDataUnsafe

          if (initData.user) {
            setDebugInfo(`Kullanıcı bulundu: ${initData.user.first_name} (ID: ${initData.user.id})`)
            await checkUserChannels(initData.user)
          } else {
            // Biraz bekleyip tekrar dene
            setTimeout(() => {
              const retryData = tg.initDataUnsafe
              if (retryData.user) {
                setDebugInfo(`İkinci denemede kullanıcı bulundu: ${retryData.user.first_name}`)
                checkUserChannels(retryData.user)
              } else {
                setDebugInfo('Telegram kullanıcı verisi bulunamadı. InitData: ' + JSON.stringify(initData))
                setLoading(false)
              }
            }, 1000)
          }
        } else {
          setDebugInfo('Telegram WebApp API bulunamadı')
          setLoading(false)
        }
      } catch (err) {
        console.error('Init error:', err)
        setError('Başlatma hatası: ' + (err instanceof Error ? err.message : String(err)))
        setLoading(false)
      }
    }

    initTelegramApp()
  }, [searchParams])

  async function checkUserChannels(user: TelegramUser) {
    try {
      const response = await fetch('/api/auth/check-channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramUser: user })
      })

      const data = await response.json()

      // Bakım modu kontrolü
      if (data.maintenanceMode) {
        setMaintenanceMode(true)
        setLoading(false)
        return
      }

      // Ban kontrolü
      if (data.isBanned) {
        setIsBanned(true)
        setBanInfo({
          reason: data.banReason,
          date: data.bannedAt,
          by: data.bannedBy
        })
        setLoading(false)
        return
      }

      if (data.needsChannelJoin) {
        router.push('/channels?userId=' + data.userId)
      } else {
        router.push('/dashboard?userId=' + data.userId)
      }
    } catch (err) {
      console.error('Channel check error:', err)
      setError('Kanal kontrolü yapılırken hata oluştu')
      setDebugInfo('API Hatası: ' + (err instanceof Error ? err.message : String(err)))
      setLoading(false)
    }
  }

  // Bakım modu ekranı
  if (maintenanceMode) {
    return <MaintenanceScreen />
  }

  // Ban ekranı
  if (isBanned) {
    return <BannedScreen banReason={banInfo.reason} bannedAt={banInfo.date} bannedBy={banInfo.by} />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl mb-2">Yükleniyor...</p>
          {debugInfo && (
            <p className="text-sm text-gray-400 mt-4 max-w-md">
              {debugInfo}
            </p>
          )}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-500 mb-2">Hata</h2>
          <p className="text-red-200">{error}</p>
          {debugInfo && (
            <p className="text-sm text-red-300 mt-4 font-mono">
              {debugInfo}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
          SüperSohbet Bot
        </h1>
        <p className="text-gray-300 mb-8">
          Lütfen Telegram üzerinden botu başlatın ve "Ödül Merkezi" butonuna tıklayın.
        </p>
        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
          <p className="text-sm text-gray-400">
            Bu sayfaya Telegram bot üzerinden erişmelisiniz.
          </p>
          {debugInfo && (
            <p className="text-xs text-gray-500 mt-4 font-mono break-words">
              Debug: {debugInfo}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl">Yükleniyor...</p>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  )
}
