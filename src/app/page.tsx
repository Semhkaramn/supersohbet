'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function HomePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Session kontrolü yap
        const response = await fetch('/api/user/me')

        if (response.ok) {
          // Kullanıcı giriş yapmış, dashboard'a yönlendir
          router.push('/dashboard')
        } else {
          // Kullanıcı giriş yapmamış, login sayfasına yönlendir
          router.push('/login')
        }
      } catch (error) {
        console.error('Auth check error:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-xl text-white">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return null
}
