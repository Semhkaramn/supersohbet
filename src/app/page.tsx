'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Ana sayfa olarak sponsors'a yönlendir
    router.push('/sponsors')
  }, [router])

  return null
}
