'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Ana sayfa olarak sponsors'a yönlendir
    router.push('/sponsors')
  }, [router])

  return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    </DashboardLayout>
  )
}
