'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-context'
import { CheckCircle2, ExternalLink, Copy } from 'lucide-react'

export default function TelegramConnectionModal() {
  const { user, showChannelModal, setShowChannelModal, refreshUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [telegramConnected, setTelegramConnected] = useState(false)
  const [botUsername, setBotUsername] = useState('')
  const [connectionToken, setConnectionToken] = useState('')
  const [tokenExpiry, setTokenExpiry] = useState<Date | null>(null)

  useEffect(() => {
    if (showChannelModal && user) {
      loadTelegramStatus()
      loadBotUsername()
      loadConnectionToken()
    }
  }, [showChannelModal, user])

  // Telegram durumu için otomatik polling
  useEffect(() => {
    if (!showChannelModal || telegramConnected) {
      return
    }

    const interval = setInterval(() => {
      loadTelegramStatus()
    }, 3000)

    return () => clearInterval(interval)
  }, [showChannelModal, telegramConnected])

  async function loadTelegramStatus() {
    try {
      const response = await fetch('/api/user/telegram-status')
      if (response.ok) {
        const data = await response.json()
        const connected = data.connected || false
        setTelegramConnected(connected)

        // If connected, close modal and refresh user
        if (connected) {
          toast.success('Telegram başarıyla bağlandı!')
          setShowChannelModal(false)
          refreshUser()
        }
      }
    } catch (error) {
      console.error('Error loading telegram status:', error)
    }
  }

  async function loadBotUsername() {
    try {
      const botRes = await fetch('/api/settings/telegram-bot-username')

      if (botRes.ok) {
        const botData = await botRes.json()
        const username = botData.username || botData.botUsername || ''
        setBotUsername(username.replace('@', ''))
      }
    } catch (error) {
      console.error('Error loading bot username:', error)
      toast.error('Bot bilgileri yüklenirken hata oluştu')
    }
  }

  async function loadConnectionToken() {
    try {
      const tokenRes = await fetch('/api/user/telegram-connection-token')

      if (tokenRes.ok) {
        const tokenData = await tokenRes.json()
        setConnectionToken(tokenData.token)
        setTokenExpiry(tokenData.expiresAt ? new Date(tokenData.expiresAt) : null)
      } else {
        const errorData = await tokenRes.json()
        if (errorData.connected) {
          setTelegramConnected(true)
        } else {
          toast.error(errorData.error || 'Token alınamadı')
        }
      }
    } catch (error) {
      console.error('Error loading connection token:', error)
      toast.error('Bağlantı kodu alınamadı')
    } finally {
      setLoading(false)
    }
  }

  function copyToken() {
    if (connectionToken) {
      navigator.clipboard.writeText(connectionToken)
      toast.success('Bağlantı kodu kopyalandı!')
    }
  }

  return (
    <Dialog open={showChannelModal} onOpenChange={setShowChannelModal}>
      <DialogContent className="sm:max-w-2xl bg-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 text-transparent bg-clip-text">
            Telegram Bağlantısı
          </DialogTitle>
          <DialogDescription className="text-gray-400 text-center">
            Devam etmek için Telegram botunu başlatın
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Telegram Bot Başlatma */}
          {!telegramConnected && connectionToken && (
            <Card className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border-blue-500/30 p-6">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-blue-500/30 flex items-center justify-center">
                  <svg className="w-8 h-8 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg mb-2">Telegram Botunu Başlat</h3>
                  <p className="text-gray-300 text-sm mb-4">
                    Aşağıdaki butona tıklayın ve bota /start komutunu gönderin
                  </p>

                  {/* Bağlantı Kodu */}
                  <div className="bg-gray-700/50 rounded-lg p-4 mb-4">
                    <p className="text-gray-400 text-xs mb-2">Bağlantı Kodunuz:</p>
                    <div className="flex items-center justify-center gap-2">
                      <code className="text-2xl font-mono font-bold text-white tracking-wider">
                        {connectionToken}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={copyToken}
                        className="h-8 w-8 p-0"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    {tokenExpiry && (
                      <p className="text-gray-500 text-xs mt-2">
                        10 dakika içinde geçerli
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  onClick={() => {
                    const username = botUsername || 'supersohbet_bot'
                    window.open(`https://t.me/${username}?start=${connectionToken}`, '_blank')
                  }}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                  disabled={!botUsername || !connectionToken}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {botUsername && connectionToken ? 'Botu Başlat' : 'Yükleniyor...'}
                </Button>
                {botUsername && (
                  <p className="text-xs text-gray-400">@{botUsername}</p>
                )}
              </div>
            </Card>
          )}

          {/* Başarılı Bağlantı */}
          {telegramConnected && (
            <Card className="bg-green-600/20 border-green-500/30 p-6 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <p className="text-green-400 font-semibold text-lg">Telegram başarıyla bağlandı!</p>
              <p className="text-gray-400 text-sm mt-2">Artık sistemi kullanabilirsiniz.</p>
            </Card>
          )}

          {loading && (
            <div className="text-center py-8">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-gray-400">Yükleniyor...</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
