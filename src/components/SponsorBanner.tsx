'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { optimizeCloudinaryImage } from '@/lib/utils'

interface Sponsor {
  id: string
  name: string
  logoUrl?: string
  websiteUrl?: string
  category: string
  isActive: boolean
  order: number
  showInBanner?: boolean
}

export default function SponsorBanner() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [isEnabled, setIsEnabled] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSponsors()
  }, [])

  async function loadSponsors() {
    try {
      // Sponsor verilerini ve banner gösterim durumunu al
      const [sponsorsRes, settingsRes] = await Promise.all([
        fetch('/api/sponsors'),
        fetch('/api/settings/sponsor-banner-enabled')
      ])

      const sponsorsData = await sponsorsRes.json()
      const settingsData = await settingsRes.json()

      // Banner etkin mi kontrol et
      setIsEnabled(settingsData.enabled === true)

      // Sadece aktif, logosu olan ve banner'da gösterilmesi istenen sponsorları al
      const activeSponsors = (sponsorsData.sponsors || [])
        .filter((s: Sponsor) => s.isActive && s.logoUrl && s.showInBanner !== false)
        .sort((a: Sponsor, b: Sponsor) => {
          // Önce order'a göre sırala
          if (a.order !== b.order) return a.order - b.order
          // VIP'leri öne al
          if (a.category === 'vip' && b.category !== 'vip') return -1
          if (a.category !== 'vip' && b.category === 'vip') return 1
          return 0
        })

      setSponsors(activeSponsors)
    } catch (error) {
      console.error('Error loading sponsor banner:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleSponsorClick(sponsorId: string, websiteUrl?: string) {
    if (!websiteUrl) return

    // Linki hemen aç
    window.open(websiteUrl, '_blank')

    // Tıklama kaydını arka planda yap
    fetch('/api/sponsors/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sponsorId })
    }).catch(error => {
      console.error('Error tracking sponsor click:', error)
    })
  }

  // Banner kapalıysa veya sponsor yoksa gösterme
  if (!isEnabled || loading || sponsors.length === 0) {
    return null
  }

  // Logoları iki kez tekrarla (kesintisiz akış için)
  const duplicatedSponsors = [...sponsors, ...sponsors]

  return (
    <div className="w-full lg:w-[calc(100%-16rem)] lg:ml-64 bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 border-b border-white/10 overflow-hidden py-2">
      <div className="relative">
        {/* Gradyan kenarlıklar (fade effect) */}
        <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-slate-900 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-slate-900 to-transparent z-10 pointer-events-none" />

        {/* Kayan sponsor logoları */}
        <div className="flex animate-scroll hover:pause-animation">
          {duplicatedSponsors.map((sponsor, index) => (
            <div
              key={`${sponsor.id}-${index}`}
              onClick={() => handleSponsorClick(sponsor.id, sponsor.websiteUrl)}
              className="flex-shrink-0 mx-3 cursor-pointer group"
              title={`${sponsor.name} - Tıklayın`}
            >
              <div className={`relative w-28 h-14 rounded-lg overflow-hidden transition-all duration-300 group-hover:scale-110 ${
                sponsor.category === 'vip'
                  ? 'bg-gradient-to-br from-yellow-900/30 to-amber-800/30 border-2 border-yellow-500/60 group-hover:border-yellow-400 shadow-lg shadow-yellow-500/20 group-hover:shadow-yellow-500/40'
                  : 'bg-white/5 border border-white/10 group-hover:border-blue-500/50 group-hover:shadow-lg group-hover:shadow-blue-500/20'
              }`}>
                {sponsor.logoUrl ? (
                  <Image
                    src={optimizeCloudinaryImage(sponsor.logoUrl, 168, 84)}
                    alt={sponsor.name}
                    width={112}
                    height={56}
                    className="object-contain p-2 w-full h-full"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-white/40 text-xs font-semibold p-2 text-center">
                    {sponsor.name}
                  </div>
                )}

                {/* VIP badge */}
                {sponsor.category === 'vip' && (
                  <div className="absolute top-1 right-1 bg-gradient-to-r from-yellow-400 to-amber-500 text-black text-[8px] font-bold px-1.5 py-0.5 rounded shadow-md">
                    VIP
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .animate-scroll {
          animation: scroll 30s linear infinite;
        }

        .hover\\:pause-animation:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  )
}
