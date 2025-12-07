'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CheckCircle2, Circle, ExternalLink } from 'lucide-react'

interface Channel {
  id: string
  channelId: string
  channelName: string
  channelLink: string
  joined: boolean
}

export default function ChannelsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const userId = searchParams.get('userId')

  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (!userId) {
      router.push('/')
      return
    }
    loadChannels()
  }, [userId])

  async function loadChannels() {
    try {
      const response = await fetch(`/api/channels/required?userId=${userId}`)
      const data = await response.json()
      setChannels(data.channels || [])
    } catch (error) {
      console.error('Error loading channels:', error)
    } finally {
      setLoading(false)
    }
  }

  async function checkChannelMembership(channelId: string) {
    setChecking(true)
    try {
      const response = await fetch('/api/channels/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, channelId })
      })

      const data = await response.json()

      if (data.joined) {
        // Kanalı güncelle
        setChannels(prev =>
          prev.map(ch =>
            ch.id === channelId ? { ...ch, joined: true } : ch
          )
        )
      }
    } catch (error) {
      console.error('Error checking membership:', error)
    } finally {
      setChecking(false)
    }
  }

  async function continueToApp() {
    const allJoined = channels.every(ch => ch.joined)
    if (allJoined) {
      router.push(`/dashboard?userId=${userId}`)
    }
  }

  const allJoined = channels.every(ch => ch.joined)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 flex items-center justify-center">
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
            Kanallara Katıl
          </h1>
          <p className="text-gray-300">
            Devam etmek için aşağıdaki kanallara katılman gerekiyor
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {channels.map((channel) => (
            <Card
              key={channel.id}
              className="bg-white/5 backdrop-blur-sm border-white/10 p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  {channel.joined ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
                  ) : (
                    <Circle className="w-6 h-6 text-gray-400 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">
                      {channel.channelName}
                    </h3>
                    {channel.joined && (
                      <p className="text-xs text-green-400">Katıldın ✓</p>
                    )}
                  </div>
                </div>
                {!channel.joined && (
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      onClick={() => window.open(channel.channelLink, '_blank')}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Katıl
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => checkChannelMembership(channel.id)}
                      disabled={checking}
                      className="border-white/20 hover:bg-white/10"
                    >
                      Kontrol Et
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>

        {allJoined ? (
          <Button
            onClick={continueToApp}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-6 text-lg"
          >
            Devam Et 🎉
          </Button>
        ) : (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-center">
            <p className="text-yellow-200 text-sm">
              Tüm kanallara katıldıktan sonra devam edebilirsin
            </p>
            <p className="text-yellow-300 font-semibold mt-2">
              {channels.filter(ch => ch.joined).length} / {channels.length} kanal
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
