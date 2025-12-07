'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

export default function HomePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    // Telegram auth verilerini kontrol et
    const telegramData = searchParams.get('tg_data')

    if (telegramData) {
      try {
        const userData: TelegramUser = JSON.parse(decodeURIComponent(telegramData))

        // Backend'e kullanıcı bilgilerini gönder ve kanal kontrolü yap
        checkUserChannels(userData)
      } catch (err) {
        console.error('Telegram auth error:', err)
        setError('Giriş yapılırken bir hata oluştu')
        setLoading(false)
      }
    } else {
      // Telegram WebApp API'den veri al
      if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
        const tg = (window as any).Telegram.WebApp
        tg.ready()

        const initData = tg.initDataUnsafe
        if (initData.user) {
          checkUserChannels(initData.user)
        } else {
          setLoading(false)
        }
      } else {
        setLoading(false)
      }
    }
  }, [searchParams])

  async function checkUserChannels(user: TelegramUser | any) {
    try {
      const response = await fetch('/api/auth/check-channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramUser: user })
      })

      const data = await response.json()

      if (data.needsChannelJoin) {
        // Kanallara katılması gerekiyor
        router.push('/channels?userId=' + data.userId)
      } else {
        // Tüm kanallara katılmış, dashboard'a yönlendir
        router.push('/dashboard?userId=' + data.userId)
      }
    } catch (err) {
      console.error('Channel check error:', err)
      setError('Kanal kontrolü yapılırken hata oluştu')
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl">Yükleniyor...</p>
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
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
          Zardan Düşenler Bot
        </h1>
        <p className="text-gray-300 mb-8">
          Lütfen Telegram üzerinden botu başlatın ve "Ödül Merkezi" butonuna tıklayın.
        </p>
        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
          <p className="text-sm text-gray-400">
            Bu sayfaya Telegram bot üzerinden erişmelisiniz.
          </p>
        </div>
      </div>
    </div>
  )
}
