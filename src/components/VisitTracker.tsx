'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function VisitTracker() {
  const pathname = usePathname()

  useEffect(() => {
    // Sayfa yüklendiğinde ziyareti kaydet
    const trackVisit = async () => {
      try {
        await fetch('/api/visit/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ page: pathname })
        })
      } catch (error) {
        // Hata olsa bile sessizce başarısız ol
        console.debug('Visit tracking failed:', error)
      }
    }

    trackVisit()
  }, [pathname]) // Pathname değiştiğinde yeniden çalış

  return null // Hiçbir şey render etme
}
