'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import BottomNav from '@/components/BottomNav'
import { Heart, ExternalLink, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

interface Sponsor {
  id: string
  name: string
  description?: string
  logoUrl?: string
  websiteUrl?: string
  clicks: number
}

function SponsorsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const userId = searchParams.get('userId')

  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      router.push('/')
      return
    }
    loadSponsors()
  }, [userId])

  async function loadSponsors() {
    try {
      const response = await fetch('/api/sponsors')
      const data = await response.json()
      setSponsors(data.sponsors || [])
    } catch (error) {
      console.error('Error loading sponsors:', error)
    } finally {
      setLoading(false)
    }
  }

  async function visitSponsor(sponsorId: string, websiteUrl?: string) {
    if (!websiteUrl) return

    try {
      // Tıklama kaydı
      await fetch('/api/sponsors/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sponsorId })
      })

      window.open(websiteUrl, '_blank')
    } catch (error) {
      console.error('Error tracking sponsor click:', error)
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
      <div className="bg-gradient-to-br from-pink-600 to-rose-600 p-6">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-white flex items-center justify-center gap-2 mb-2">
            <Heart className="w-8 h-8" />
            Sponsorlar
          </h1>
          <p className="text-white/80">
            Zardan Düşenler platformunu destekleyen ve binlerce kullanıcıya ulaşmak için sponsor olabilirsiniz.
          </p>
        </div>
      </div>

      {/* Become Sponsor CTA */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30 p-6 mb-6">
          <div className="text-center">
            <Heart className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-white mb-2">
              Sponsor olmak ister misiniz?
            </h3>
            <p className="text-white/80 mb-4">
              Zardan Düşenler platformunu desteklemek ve binlerce kullanıcıya ulaşmak için sponsor olabilirsiniz.
              Farklı sponsorluk paketlerimiz hakkında bilgi almak için bizimle iletişime geçin.
            </p>
            <Button
              onClick={() => toast.info('İletişim için: @zardan_dusenler')}
              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              İletişime Geç
            </Button>
          </div>
        </Card>

        {/* Sponsors List */}
        {sponsors.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">Henüz sponsor bulunmuyor</p>
            <p className="text-gray-500 text-sm mt-2">Ana Sayfaya Dön butonunu kullanarak ana sayfaya dönebilirsiniz</p>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white mb-4">Mevcut Sponsorlarımız</h2>
            {sponsors.map(sponsor => (
              <Card key={sponsor.id} className="bg-white/5 border-white/10 p-5 hover:bg-white/10 transition-colors">
                <div className="flex items-start gap-4">
                  {sponsor.logoUrl && (
                    <div className="w-20 h-20 rounded-lg bg-white/10 flex-shrink-0 relative overflow-hidden">
                      <Image
                        src={sponsor.logoUrl}
                        alt={sponsor.name}
                        fill
                        className="object-contain p-2"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-white mb-1">{sponsor.name}</h3>
                    {sponsor.description && (
                      <p className="text-gray-300 text-sm mb-3">{sponsor.description}</p>
                    )}
                    <div className="flex items-center gap-4">
                      {sponsor.websiteUrl && (
                        <Button
                          onClick={() => visitSponsor(sponsor.id, sponsor.websiteUrl)}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          Ziyaret Et
                        </Button>
                      )}
                      <span className="text-gray-400 text-xs flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {sponsor.clicks} ziyaret
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <BottomNav userId={userId!} />
    </div>
  )
}

export default function SponsorsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <SponsorsContent />
    </Suspense>
  )
}
