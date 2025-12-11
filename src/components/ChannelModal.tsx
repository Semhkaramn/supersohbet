'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-context'
import { CheckCircle2, ExternalLink } from 'lucide-react'

interface Channel {
  id: string
  channelId: string
  channelName: string
  channelLink: string
  channelUsername?: string
  joined: boolean
}

export default function ChannelModal() {
  const { user, showChannelModal, setShowChannelModal, refreshUser } = useAuth()
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)
  const [telegramConnected, setTelegramConnected] = useState(false)
  const [telegramStarted, setTelegramStarted] = useState(false)
  const [botUsername, setBotUsername] = useState('')

  useEffect(() => {
    if (showChannelModal && user) {
      loadTelegramStatus()
      loadChannels()
    }
  }, [showChannelModal, user])

  // Otomatik kontrol - Her 3 saniyede bir
  useEffect(() => {
    if (!showChannelModal || channels.length === 0 || channels.every(ch => ch.joined)) {
      return
    }

    const interval = setInterval(() => {
      checkAllChannels()
    }, 3000)

    return () => clearInterval(interval)
  }, [channels, showChannelModal])

  // Telegram durumu için otomatik polling
  useEffect(() => {
    if (!showChannelModal || telegramStarted) {
      return
    }

    const interval = setInterval(() => {
      loadTelegramStatus()
    }, 3000)

    return () => clearInterval(interval)
  }, [showChannelModal, telegramStarted])

  async function loadTelegramStatus() {
    try {
      const response = await fetch('/api/user/telegram-status')
      if (response.ok) {
        const data = await response.json()
        setTelegramConnected(data.connected || false)
        setTelegramStarted(data.hadStart || false)
      }
    } catch (error) {
      console.error('Error loading telegram status:', error)
    }
  }

  async function loadChannels() {
    try {
      const [channelsRes, botRes] = await Promise.all([
        fetch('/api/channels/required'),
        fetch('/api/settings/telegram-bot-username')
      ])

      if (channelsRes.ok) {
        const data = await channelsRes.json()
        setChannels(data.channels || [])
      }

      if (botRes.ok) {
        const botData = await botRes.json()
        console.log('🤖 Bot API Response:', botData)
        // username veya botUsername olabilir, her ikisini de kontrol et
        const username = botData.username || botData.botUsername || ''
        console.log('🤖 Bot Username:', username)
        setBotUsername(username.replace('@', ''))
      } else {
        console.error('❌ Bot API failed:', botRes.status)
      }
    } catch (error) {
      console.error('Error loading channels:', error)
      toast.error('Kanallar yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  async function checkAllChannels() {
    try {
      const unjoinedChannels = channels.filter(ch => !ch.joined)

      for (const channel of unjoinedChannels) {
        const response = await fetch('/api/channels/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channelId: channel.id })
        })

        const data = await response.json()

        if (data.joined) {
          setChannels(prev =>
            prev.map(ch =>
              ch.id === channel.id ? { ...ch, joined: true } : ch
            )
          )
        }
      }
    } catch (error) {
      console.error('Error checking channels:', error)
    }
  }

  function getChannelPhoto(channel: Channel) {
    if (channel.channelUsername) {
      return `https://t.me/i/userpic/320/${channel.channelUsername}.jpg`
    }
    return null
  }

  const unjoinedChannels = channels.filter(ch => !ch.joined)
  const joinedCount = channels.filter(ch => ch.joined).length
  const allJoined = channels.length > 0 && unjoinedChannels.length === 0

  // Tüm kanallara katıldıysa modal'ı kapat
  useEffect(() => {
    if (allJoined && telegramConnected && telegramStarted && channels.length > 0) {
      toast.success('Tüm kanallara başarıyla katıldınız!')
      setShowChannelModal(false)
      refreshUser()
    }
  }, [allJoined, telegramConnected, telegramStarted, channels.length])

  return (
    <Dialog open={showChannelModal} onOpenChange={setShowChannelModal}>
      <DialogContent className="sm:max-w-2xl bg-gray-800 border-gray-700 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 text-transparent bg-clip-text">
            Telegram Bağlantısı
          </DialogTitle>
          <DialogDescription className="text-gray-400 text-center">
            Devam etmek için Telegram botunu başlatın ve kanallara katılın
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Telegram Bot Başlatma */}
          {!telegramStarted && (
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
                    Telegram botunu başlatmak için /start komutunu gönderin
                  </p>
                </div>
                <Button
                  onClick={() => {
                    const username = botUsername || 'supersohbet_bot'
                    console.log('🔵 Opening Telegram with username:', username)
                    window.open(`https://t.me/${username}?start=connect`, '_blank')
                  }}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {botUsername ? 'Botu Başlat' : 'Yükleniyor...'}
                </Button>
                {botUsername && (
                  <p className="text-xs text-gray-400">@{botUsername}</p>
                )}
              </div>
            </Card>
          )}

          {/* İlerleme çubuğu */}
          {telegramStarted && channels.length > 0 && (
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-400">Kanal İlerlemesi</span>
                <span className="text-sm font-semibold text-blue-400">
                  {joinedCount} / {channels.length}
                </span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-full transition-all duration-500 ease-out"
                  style={{ width: `${(joinedCount / channels.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Kanal listesi */}
          {telegramStarted && (
            <div className="space-y-3">
              <h3 className="text-white font-semibold text-lg">Kanallara Katıl</h3>
              {unjoinedChannels.length === 0 && channels.length > 0 ? (
                <Card className="bg-green-600/20 border-green-500/30 p-6 text-center">
                  <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <p className="text-green-400 font-semibold">Tüm kanallara başarıyla katıldınız!</p>
                </Card>
              ) : (
                unjoinedChannels.map((channel) => {
                  const photoUrl = getChannelPhoto(channel)

                  return (
                    <Card
                      key={channel.id}
                      className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-white/10 p-4 hover:border-blue-500/30 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative flex-shrink-0">
                          {photoUrl ? (
                            <img
                              src={photoUrl}
                              alt={channel.channelName}
                              className="w-14 h-14 rounded-full object-cover ring-2 ring-blue-500/30"
                              onError={(e) => {
                                e.currentTarget.src = 'https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg'
                              }}
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                              <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                              </svg>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-white truncate mb-1">
                            {channel.channelName}
                          </h4>
                          <p className="text-sm text-gray-400">
                            {channel.channelUsername ? `@${channel.channelUsername}` : 'Telegram Kanalı'}
                          </p>
                        </div>

                        <Button
                          size="sm"
                          onClick={() => window.open(channel.channelLink, '_blank')}
                          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold"
                        >
                          Katıl
                        </Button>
                      </div>
                    </Card>
                  )
                })
              )}
            </div>
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
