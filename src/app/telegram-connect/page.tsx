'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Send } from 'lucide-react'
import { toast } from 'sonner'

export default function TelegramConnectPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [botUsername, setBotUsername] = useState<string>('')
  const [connected, setConnected] = useState(false)
  const [connectionToken, setConnectionToken] = useState<string | null>(null)
  const [tokenExpiry, setTokenExpiry] = useState<Date | null>(null)

  // Bot username ve token al
  useEffect(() => {
    Promise.all([
      fetch('/api/settings/telegram-bot-username').then(res => res.json()),
      fetch('/api/user/telegram-connection-token').then(res => res.json())
    ])
      .then(([botData, tokenData]) => {
        if (botData.username) {
          setBotUsername('@' + botData.username.replace('@', ''))
        } else if (botData.error) {
          toast.error('Bot username ayarlanmamış. Lütfen yöneticiyle iletişime geçin.')
        }
        if (tokenData.token) {
          setConnectionToken(tokenData.token)
          setTokenExpiry(new Date(tokenData.expiresAt))
        }
      })
      .catch(error => {
        console.error('Error loading data:', error)
        toast.error('Bağlantı bilgileri alınamadı')
      })
      .finally(() => setLoading(false))
  }, [])

  // Otomatik polling - Her 3 saniyede bir kontrol
  useEffect(() => {
    if (connected) return

    const interval = setInterval(() => {
      checkTelegramStatus()
    }, 3000)

    return () => clearInterval(interval)
  }, [connected])

  const checkTelegramStatus = async () => {
    try {
      const response = await fetch('/api/user/telegram-status')

      if (response.status === 401) {
        router.push('/login')
        return
      }

      const data = await response.json()

      if (data.connected && data.hadStart && data.telegramId) {
        setConnected(true)
        toast.success('Telegram hesabınız başarıyla bağlandı! ✓')

        // 1.5 saniye sonra kanallara yönlendir
        setTimeout(() => {
          router.push('/channels')
        }, 1500)
      }
    } catch (error) {
      console.error('Error checking Telegram status:', error)
    }
  }

  const handleOpenTelegram = () => {
    // Token ile birlikte otomatik start komutu gönder
    const botUsernameClean = botUsername.replace('@', '')
    const telegramUrl = connectionToken
      ? `https://t.me/${botUsernameClean}?start=${connectionToken}`
      : `https://t.me/${botUsernameClean}`
    window.open(telegramUrl, '_blank')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <Card className="w-full max-w-md border-gray-700 bg-gray-800/50 backdrop-blur">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-500/10 rounded-full">
              <Send className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-white">
            Telegram Hesabınızı Bağlayın
          </CardTitle>
          <CardDescription className="text-gray-400">
            Kanal kontrolü için Telegram hesabınızı bağlamanız gerekiyor
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {connected ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-4 bg-green-500/10 rounded-full">
                  <CheckCircle2 className="w-12 h-12 text-green-500" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Bağlantı Başarılı!
                </h3>
                <p className="text-gray-400">
                  Kanal sayfasına yönlendiriliyorsunuz...
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 space-y-3">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  📱 Nasıl Bağlanılır?
                </h3>
                <ol className="space-y-2 text-gray-300">
                  <li className="flex gap-2">
                    <span className="font-semibold text-blue-400">1.</span>
                    <span>Aşağıdaki butona tıklayın</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-blue-400">2.</span>
                    <span>Telegram'da açılan {botUsername} botunda "START" butonuna basın</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-blue-400">3.</span>
                    <span>Hesabınız otomatik olarak bağlanacak</span>
                  </li>
                </ol>
              </div>

              {connectionToken && tokenExpiry && (
                <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-3">
                  <p className="text-xs text-gray-400 text-center">
                    ⏱️ Bağlantı kodu {new Date(tokenExpiry).toLocaleTimeString('tr-TR')} tarihine kadar geçerlidir
                  </p>
                </div>
              )}

              <Button
                onClick={handleOpenTelegram}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                <Send className="w-5 h-5 mr-2" />
                Telegram'da Bağlan
              </Button>

              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <p className="text-sm text-yellow-200 flex items-start gap-2">
                  <span className="text-xl">⚠️</span>
                  <span>
                    Telegram ID olmadan kanal kontrolü yapılamaz ve siteyi kullanamazsınız!
                  </span>
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
