'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react'

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

// ✅ OPTIMIZASYON: State ve Actions için ayrı context'ler
interface AuthStateContextType {
  user: UserData | null
  loading: boolean
  isAuthenticated: boolean
}

interface AuthActionsContextType {
  refreshUser: () => Promise<void>
  logout: () => Promise<void>
  requireAuth: (redirectUrl: string) => boolean
}

// ✅ OPTIMIZASYON: Modal state'leri için ayrı context
interface ModalContextType {
  showLoginModal: boolean
  showRegisterModal: boolean
  showChannelModal: boolean
  returnUrl: string | null
  setShowLoginModal: (show: boolean) => void
  setShowRegisterModal: (show: boolean) => void
  setShowChannelModal: (show: boolean) => void
  setReturnUrl: (url: string | null) => void
}

const AuthStateContext = createContext<AuthStateContextType | undefined>(undefined)
const AuthActionsContext = createContext<AuthActionsContextType | undefined>(undefined)
const ModalContext = createContext<ModalContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [showChannelModal, setShowChannelModal] = useState(false)
  const [returnUrl, setReturnUrl] = useState<string | null>(null)

  // ✅ OPTIMIZASYON: useCallback ile fonksiyonları memoize et
  const refreshUser = useCallback(async () => {
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
  }, [])

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      setUser(null)
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }, [])

  const requireAuth = useCallback((redirectUrl: string): boolean => {
    if (!user && !loading) {
      setReturnUrl(redirectUrl)
      setShowLoginModal(true)
      return false
    }
    return !!user
  }, [user, loading])

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  // ✅ OPTIMIZASYON: useMemo ile state değerlerini memoize et
  const authState = useMemo(() => ({
    user,
    loading,
    isAuthenticated: !!user,
  }), [user, loading])

  const authActions = useMemo(() => ({
    refreshUser,
    logout,
    requireAuth
  }), [refreshUser, logout, requireAuth])

  const modalState = useMemo(() => ({
    showLoginModal,
    showRegisterModal,
    showChannelModal,
    returnUrl,
    setShowLoginModal,
    setShowRegisterModal,
    setShowChannelModal,
    setReturnUrl,
  }), [showLoginModal, showRegisterModal, showChannelModal, returnUrl])

  return (
    <AuthStateContext.Provider value={authState}>
      <AuthActionsContext.Provider value={authActions}>
        <ModalContext.Provider value={modalState}>
          {children}
        </ModalContext.Provider>
      </AuthActionsContext.Provider>
    </AuthStateContext.Provider>
  )
}

// ✅ OPTIMIZASYON: State ve actions için ayrı hook'lar
export function useAuthState() {
  const context = useContext(AuthStateContext)
  if (context === undefined) {
    throw new Error('useAuthState must be used within an AuthProvider')
  }
  return context
}

export function useAuthActions() {
  const context = useContext(AuthActionsContext)
  if (context === undefined) {
    throw new Error('useAuthActions must be used within an AuthProvider')
  }
  return context
}

export function useModalState() {
  const context = useContext(ModalContext)
  if (context === undefined) {
    throw new Error('useModalState must be used within an AuthProvider')
  }
  return context
}

// ✅ UYUMLULUK: Eski useAuth hook'u için wrapper (geriye dönük uyumluluk)
export function useAuth() {
  const state = useAuthState()
  const actions = useAuthActions()
  const modals = useModalState()

  return {
    ...state,
    ...actions,
    ...modals
  }
}
