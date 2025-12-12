'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface UserData {
  id: string
  username?: string
  firstName?: string
  lastName?: string
  photoUrl?: string
  email?: string
  telegramId?: string
  points: number
  xp: number
  rank?: {
    name: string
    icon: string
    color: string
  }
  leaderboardRank?: number
}

interface AuthContextType {
  user: UserData | null
  loading: boolean
  isAuthenticated: boolean
  showLoginModal: boolean
  showRegisterModal: boolean
  showChannelModal: boolean
  returnUrl: string | null
  setShowLoginModal: (show: boolean) => void
  setShowRegisterModal: (show: boolean) => void
  setShowChannelModal: (show: boolean) => void
  setReturnUrl: (url: string | null) => void
  refreshUser: () => Promise<void>
  logout: () => Promise<void>
  requireAuth: (redirectUrl: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [showChannelModal, setShowChannelModal] = useState(false)
  const [returnUrl, setReturnUrl] = useState<string | null>(null)

  const refreshUser = async () => {
    try {
      const response = await fetch('/api/user/me')
      if (response.ok) {
        const data = await response.json()
        setUser(data)
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('Error loading user:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      setUser(null)
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  const requireAuth = (redirectUrl: string): boolean => {
    if (!user && !loading) {
      setReturnUrl(redirectUrl)
      setShowLoginModal(true)
      return false
    }
    return !!user
  }

  useEffect(() => {
    refreshUser()
  }, [])

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    showLoginModal,
    showRegisterModal,
    showChannelModal,
    returnUrl,
    setShowLoginModal,
    setShowRegisterModal,
    setShowChannelModal,
    setReturnUrl,
    refreshUser,
    logout,
    requireAuth
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
