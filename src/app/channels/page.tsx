'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

interface Channel {
  id: string
  channelId: string
  channelName: string
  channelLink: string
  channelUsername?: string
  joined: boolean
}

function ChannelsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const userId = searchParams.get('userId')

  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      router.push('/')
      return
    }
    loadChannels()
  }, [userId])

  // Otomatik kontrol - Her 3 saniyede bir
  useEffect(() => {
    if (channels.length === 0 || channels.every(ch => ch.joined)) {
      return
    }

    const interval = setInterval(() => {
      checkAllChannels()
    }, 3000)

    return () => clearInterval(interval)
  }, [channels, userId])

  async function loadChannels() {
    try {
      const response = await fetch(`/api/channels/required?userId=${userId}`)
      const data = await response.json()
      setChannels(data.channels || [])
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
        console.log('🔍 Kanal kontrolü yapılıyor:', {
          channelId: channel.id,
          channelTelegramId: channel.channelId,
          channelName: channel.channelName,
          userId: userId
        })

        const response = await fetch('/api/channels/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, channelId: channel.id })
        })

        const data = await response.json()

        console.log('📊 Kanal kontrol sonucu:', {
          channel: channel.channelName,
          joined: data.joined,
          response: data
        })

        if (data.joined) {
          setChannels(prev =>
            prev.map(ch =>
              ch.id === channel.id ? { ...ch, joined: true } : ch
            )
          )
          toast.success(`${channel.channelName} kanalına katıldınız! ✓`, {
            duration: 3000
          })
        } else if (data.error) {
          console.error('❌ Kanal kontrolünde hata:', data.error)
        }
      }
    } catch (error) {
      console.error('Error checking channels:', error)
    }
  }

  // Telegram kanal fotoğrafını al
  function getChannelPhoto(channel: Channel) {
    // Telegram kanal kullanıcı adından fotoğraf URL'i oluştur
    if (channel.channelUsername) {
      return `https://t.me/i/userpic/320/${channel.channelUsername}.jpg`
    }
    return null
  }

  // Katılınmamış kanalları filtrele
  const unjoinedChannels = channels.filter(ch => !ch.joined)
  const joinedCount = channels.filter(ch => ch.joined).length
  const allJoined = channels.length > 0 && unjoinedChannels.length === 0

  // Tüm kanallara katıldıysa otomatik devam et
  useEffect(() => {
    if (allJoined && channels.length > 0) {
      setTimeout(() => {
        router.push(`/dashboard?userId=${userId}`)
      }, 1500)
    }
  }, [allJoined, channels.length, userId, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300">Kanallar yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (allJoined) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="mb-6">
            <CheckCircle2 className="w-24 h-24 text-green-500 mx-auto mb-4 animate-bounce" />
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-green-400 to-emerald-500 text-transparent bg-clip-text">
              Harika! 🎉
            </h1>
            <p className="text-gray-300">
              Tüm kanallara katıldınız. Dashboard'a yönlendiriliyorsunuz...
            </p>
          </div>
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 pb-20">
      <div className="max-w-2xl mx-auto pt-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 text-transparent bg-clip-text">
            Kanallara Katıl
          </h1>
          <p className="text-gray-300 text-lg">
            Devam etmek için aşağıdaki kanallara katılman gerekiyo
          </p>
        </div>

        {/* İlerleme çubuğu */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-gray-400">İlerleme</span>
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

        {/* Kanal listesi - Sadece katılınmayanlar */}
        <div className="space-y-4">
          {unjoinedChannels.map((channel) => {
            const photoUrl = getChannelPhoto(channel)

            return (
              <Card
                key={channel.id}
                className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border-white/10 p-5 hover:border-blue-500/30 transition-all duration-300 shadow-lg"
              >
                <div className="flex items-center gap-4">
                  {/* Telegram Kanal Fotoğrafı */}
                  <div className="relative flex-shrink-0">
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt={channel.channelName}
                        className="w-16 h-16 rounded-full object-cover ring-2 ring-blue-500/30"
                        onError={(e) => {
                          // Fotoğraf yüklenemezse varsayılan Telegram logosu göster
                          e.currentTarget.src = 'https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg'
                        }}
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Kanal Bilgileri */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white text-lg truncate mb-1">
                      {channel.channelName}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {channel.channelUsername ? `@${channel.channelUsername}` : 'Telegram Kanalı'}
                    </p>
                  </div>

                  {/* Katıl Butonu */}
                  <Button
                    size="lg"
                    onClick={() => window.open(channel.channelLink, '_blank')}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold shadow-lg hover:shadow-blue-500/50 transition-all duration-300"
                  >
                    Katıl
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>


      </div>
    </div>
  )
}

export default function ChannelsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <ChannelsContent />
    </Suspense>
  )
}
