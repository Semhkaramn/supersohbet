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
  const [currentUser, setCurrentUser] = useState<TelegramUser | null>(null)

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
              setCurrentUser(userData)
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
            setCurrentUser(initData.user)
            await checkUserChannels(initData.user)
          } else {
            // Biraz bekleyip tekrar dene
            setTimeout(() => {
              const retryData = tg.initDataUnsafe
              if (retryData.user) {
                setDebugInfo(`İkinci denemede kullanıcı bulundu: ${retryData.user.first_name}`)
                setCurrentUser(retryData.user)
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
      <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-slate-900 via-blue-900/20 to-purple-900/20">
        <div className="text-center max-w-md">
          {currentUser ? (
            <div className="space-y-6">
              {/* User Profile */}
              <div className="flex flex-col items-center">
                {currentUser.photo_url ? (
                  <img
                    src={currentUser.photo_url}
                    alt={currentUser.first_name}
                    className="w-24 h-24 rounded-full border-4 border-blue-500/50 shadow-lg mb-4"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-blue-500/50 shadow-lg mb-4">
                    {currentUser.first_name.charAt(0).toUpperCase()}
                  </div>
                )}

                <h2 className="text-2xl font-bold text-white mb-1">
                  {currentUser.first_name} {currentUser.last_name || ''}
                </h2>
                {currentUser.username && (
                  <p className="text-blue-400 text-lg">@{currentUser.username}</p>
                )}
              </div>

              {/* Loading Animation */}
              <div className="flex flex-col items-center space-y-4">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <div className="space-y-2">
                  <p className="text-xl font-semibold text-white">Giriş yapılıyor...</p>
                  <p className="text-sm text-gray-400">Hesabınız kontrol ediliyor</p>
                </div>
              </div>

              {/* Progress Dots */}
              <div className="flex justify-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xl text-white">Yükleniyor...</p>
              {debugInfo && (
                <p className="text-sm text-gray-400 mt-4">
                  {debugInfo}
                </p>
              )}
            </div>
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
