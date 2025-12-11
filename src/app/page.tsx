'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import DashboardLayout from '@/components/DashboardLayout'
import { Heart, TrendingUp, Crown, Sparkles, Search } from 'lucide-react'

import Image from 'next/image'

interface Sponsor {
  id: string
  name: string
  description?: string
  logoUrl?: string
  websiteUrl?: string
  category: string
  clicks: number
}

function SponsorsContent() {
  const router = useRouter()
  const { user } = useAuth()

  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadSponsors()
  }, [])

  async function loadSponsors() {
    try {
      const response = await fetch('/api/sponsors')
      const data = await response.json()
      // VIP sponsorları üste getir
      const sorted = (data.sponsors || []).sort((a: Sponsor, b: Sponsor) => {
        if (a.category === 'vip' && b.category !== 'vip') return -1
        if (a.category !== 'vip' && b.category === 'vip') return 1
        return 0
      })
      setSponsors(sorted)
    } catch (error) {
      console.error('Error loading sponsors:', error)
    } finally {
      setLoading(false)
    }
  }

  async function visitSponsor(sponsorId: string, websiteUrl?: string) {
    if (!websiteUrl) return

    try {
      // Tıklama kaydı (sadece giriş yapmış kullanıcılar için)
      if (user) {
        await fetch('/api/sponsors/click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sponsorId })
        })
      }

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

  // Filter sponsors based on search term
  const filteredSponsors = sponsors.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.description && s.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const vipSponsors = filteredSponsors.filter(s => s.category === 'vip')
  const normalSponsors = filteredSponsors.filter(s => s.category !== 'vip')

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Sponsors List */}
      <div className="max-w-2xl mx-auto px-4">
        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
          <Input
            type="text"
            placeholder="Sponsor ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white/20 border-white/30 text-white placeholder:text-slate-300 focus:bg-white/30 focus:border-white/50 transition-all"
          />
        </div>

        {filteredSponsors.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">Henüz sponsor bulunmuyor</p>
            <p className="text-gray-500 text-sm mt-2">Ana Sayfaya Dön butonunu kullanarak ana sayfaya dönebilirsiniz</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* VIP Sponsors Section */}
            {vipSponsors.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Crown className="w-6 h-6 text-yellow-400 animate-pulse" fill="currentColor" />
                  <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500">
                    VIP Sponsorlar
                  </h2>
                  <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
                </div>

                {vipSponsors.map((sponsor, index) => (
                  <Card
                    key={sponsor.id}
                    className="relative overflow-hidden bg-gradient-to-br from-yellow-900/30 via-amber-900/20 to-yellow-800/30 border-2 border-yellow-500/50 p-6 hover:border-yellow-400 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-yellow-500/20 group"
                    style={{
                      animation: `float ${3 + index * 0.5}s ease-in-out infinite`
                    }}
                  >
                    {/* Animated background effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/0 via-yellow-400/10 to-yellow-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-shimmer" />

                    {/* Sparkle effects */}
                    <div className="absolute top-2 right-2">
                      <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
                    </div>
                    <div className="absolute bottom-2 left-2">
                      <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" style={{ animationDelay: '0.5s' }} />
                    </div>

                    <div className="relative flex items-start gap-4">
                      {sponsor.logoUrl && (
                        <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-yellow-400/20 to-amber-600/20 flex-shrink-0 relative overflow-hidden border-2 border-yellow-400/30 shadow-lg shadow-yellow-500/20 group-hover:shadow-yellow-400/40 transition-all">
                          <Image
                            src={sponsor.logoUrl}
                            alt={sponsor.name}
                            fill
                            className="object-contain p-3"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Crown className="w-5 h-5 text-yellow-400" fill="currentColor" />
                          <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-400">
                            {sponsor.name}
                          </h3>
                        </div>
                        {sponsor.description && (
                          <p className="text-yellow-100/90 text-sm mb-4 leading-relaxed">{sponsor.description}</p>
                        )}
                        <div className="flex items-center gap-4">
                          {sponsor.websiteUrl && (
                            <Button
                              onClick={() => visitSponsor(sponsor.id, sponsor.websiteUrl)}
                              size="sm"
                              className="bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-slate-900 font-bold shadow-lg hover:shadow-yellow-500/50 transition-all hover:scale-105"
                            >
                              <Sparkles className="w-4 h-4 mr-1" />
                              Ziyaret Et
                            </Button>
                          )}
                          <span className="text-yellow-300/80 text-xs flex items-center gap-1 font-medium">
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

            {/* Normal Sponsors Section */}
            {normalSponsors.length > 0 && (
              <div className="space-y-4">
                {vipSponsors.length > 0 && (
                  <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Heart className="w-5 h-5 text-slate-400" />
                    Sponsorlar
                  </h2>
                )}

                {normalSponsors.map(sponsor => (
                  <Card
                    key={sponsor.id}
                    className="bg-white/5 border-white/10 p-5 hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:scale-[1.01] group"
                  >
                    <div className="flex items-start gap-4">
                      {sponsor.logoUrl && (
                        <div className="w-20 h-20 rounded-lg bg-white/10 flex-shrink-0 relative overflow-hidden border border-white/10 group-hover:border-white/20 transition-all">
                          <Image
                            src={sponsor.logoUrl}
                            alt={sponsor.name}
                            fill
                            className="object-contain p-2"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold text-white mb-1 group-hover:text-blue-300 transition-colors">{sponsor.name}</h3>
                        {sponsor.description && (
                          <p className="text-gray-300 text-sm mb-3">{sponsor.description}</p>
                        )}
                        <div className="flex items-center gap-4">
                          {sponsor.websiteUrl && (
                            <Button
                              onClick={() => visitSponsor(sponsor.id, sponsor.websiteUrl)}
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 transition-all hover:scale-105"
                            >
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
        )}
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        .animate-shimmer {
          animation: shimmer 3s infinite;
        }
      `}</style>
    </div>
  )
}

export default function HomePage() {
  return (
    <DashboardLayout showSponsorBanner={true}>
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }>
        <SponsorsContent />
      </Suspense>
    </DashboardLayout>
  )
}
