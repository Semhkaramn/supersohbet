'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

// Types
interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date?: number
  hash?: string
}

interface UserData {
  id: string
  telegramId: string
  username?: string
  firstName?: string
  lastName?: string
  photoUrl?: string
  points: number
  xp: number
  totalMessages: number
  totalReferrals?: number
  referralPoints?: number
  messageStats?: {
    daily: number
    weekly: number
    monthly: number
    total: number
  }
  rank?: {
    name: string
    icon: string
    color: string
    minXp: number
  }
  nextRank?: {
    name: string
    minXp: number
  }
  dailySpinsLeft: number
  leaderboardRank?: number
  banned?: boolean
  banReason?: string
  bannedAt?: Date | string
  bannedBy?: string
  createdAt?: string
  pointHistory?: Array<{
    id: string
    amount: number
    type: string
    description: string
    adminUsername?: string
    createdAt: string
  }>
}

interface Task {
  id: string
  title: string
  description?: string
  category: string
  taskType: string
  targetValue: number
  currentProgress: number
  xpReward: number
  pointsReward: number
  progress: string
  completed: boolean
  rewardClaimed: boolean
}

interface TaskHistoryItem {
  id: string
  taskId: string
  title: string
  description?: string
  category: string
  taskType: string
  targetValue: number
  completedProgress: number
  xpReward: number
  pointsReward: number
  completedAt: string
  claimedAt: string
}

interface ShopItem {
  id: string
  name: string
  description?: string
  price: number
  imageUrl?: string
  category: string
  stock?: number
}

interface Purchase {
  id: string
  item: {
    name: string
    description?: string
    imageUrl?: string
  }
  pointsSpent: number
  status: string
  purchasedAt: string
}

interface Sponsor {
  id: string
  name: string
  description?: string
  imageUrl?: string
  logoUrl?: string
  link: string
  websiteUrl?: string
  position: number
  clickCount?: number
  clicks?: number
  category?: string
}

interface LeaderboardEntry {
  id: string
  telegramId: string
  username?: string
  firstName?: string
  photoUrl?: string
  points: number
  xp: number
  totalMessages?: number
  position?: number
  rank?: {
    name: string
    icon: string
    color: string
  }
}

interface WheelPrize {
  id: string
  name: string
  type: string
  value: number
  points?: number
  probability: number
  color?: string
  order?: number
}

interface WheelWinner {
  id: string
  user: {
    username?: string
    firstName?: string
  }
  prize: {
    name: string
    value: number
  }
  pointsWon?: number
  wonAt: string
  spunAt?: string
}

interface AppData {
  userData: UserData | null
  dailyTasks: Task[]
  weeklyTasks: Task[]
  permanentTasks: Task[]
  taskHistory: TaskHistoryItem[]
  referralCount: number
  shopItems: ShopItem[]
  purchases: Purchase[]
  sponsors: Sponsor[]
  leaderboard: LeaderboardEntry[]
  wheelPrizes: WheelPrize[]
  recentWinners: WheelWinner[]
  channels: any[]
}

interface UserContextType {
  telegramUser: TelegramUser | null
  appData: AppData
  loading: boolean
  initializing: boolean
  setTelegramUser: (user: TelegramUser | null) => void
  refreshUserData: () => Promise<void>
  refreshTasks: () => Promise<void>
  refreshShop: () => Promise<void>
  refreshAll: () => Promise<void>
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null)
  const [appData, setAppData] = useState<AppData>({
    userData: null,
    dailyTasks: [],
    weeklyTasks: [],
    permanentTasks: [],
    taskHistory: [],
    referralCount: 0,
    shopItems: [],
    purchases: [],
    sponsors: [],
    leaderboard: [],
    wheelPrizes: [],
    recentWinners: [],
    channels: []
  })
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(true)

  // Tüm verileri yükle
  const fetchAllData = useCallback(async (userId: string) => {
    try {
      setLoading(true)

      // Tüm API çağrılarını paralel yap
      const [
        userRes,
        tasksRes,
        referralRes,
        shopItemsRes,
        purchasesRes,
        sponsorsRes,
        leaderboardRes,
        wheelPrizesRes,
        wheelWinnersRes,
        channelsRes
      ] = await Promise.all([
        fetch(`/api/user/${userId}`),
        fetch(`/api/task?userId=${userId}`),
        fetch(`/api/referral/info?userId=${userId}`),
        fetch('/api/shop/items'),
        fetch(`/api/user/${userId}/purchases`),
        fetch('/api/sponsors'),
        fetch('/api/leaderboard'),
        fetch('/api/wheel/prizes'),
        fetch('/api/wheel/recent-winners'),
        fetch('/api/channels/required')
      ])

      const [
        userData,
        tasksData,
        referralData,
        shopItemsData,
        purchasesData,
        sponsorsData,
        leaderboardData,
        wheelPrizesData,
        wheelWinnersData,
        channelsData
      ] = await Promise.all([
        userRes.json(),
        tasksRes.json(),
        referralRes.json(),
        shopItemsRes.json(),
        purchasesRes.json(),
        sponsorsRes.json(),
        leaderboardRes.json(),
        wheelPrizesRes.json(),
        wheelWinnersRes.json(),
        channelsRes.json()
      ])

      setAppData({
        userData,
        dailyTasks: tasksData.dailyTasks || [],
        weeklyTasks: tasksData.weeklyTasks || [],
        permanentTasks: tasksData.permanentTasks || [],
        taskHistory: tasksData.taskHistory || [],
        referralCount: referralData.totalReferrals || 0,
        shopItems: shopItemsData.items || [],
        purchases: purchasesData.purchases || [],
        sponsors: sponsorsData.sponsors || [],
        leaderboard: leaderboardData.leaderboard || [],
        wheelPrizes: wheelPrizesData.prizes || [],
        recentWinners: wheelWinnersData.winners || [],
        channels: channelsData.channels || []
      })
    } catch (error) {
      console.error('Error fetching all data:', error)
    } finally {
      setLoading(false)
      setInitializing(false)
    }
  }, [])

  // Sadece kullanıcı verisini yenile
  const refreshUserData = useCallback(async () => {
    if (!appData.userData?.id) return

    try {
      const response = await fetch(`/api/user/${appData.userData.id}`)
      const userData = await response.json()
      setAppData(prev => ({ ...prev, userData }))
    } catch (error) {
      console.error('Error refreshing user data:', error)
    }
  }, [appData.userData?.id])

  // Sadece görevleri yenile
  const refreshTasks = useCallback(async () => {
    if (!appData.userData?.id) return

    try {
      const [tasksRes, referralRes] = await Promise.all([
        fetch(`/api/task?userId=${appData.userData.id}`),
        fetch(`/api/referral/info?userId=${appData.userData.id}`)
      ])

      const tasksData = await tasksRes.json()
      const referralData = await referralRes.json()

      setAppData(prev => ({
        ...prev,
        dailyTasks: tasksData.dailyTasks || [],
        weeklyTasks: tasksData.weeklyTasks || [],
        permanentTasks: tasksData.permanentTasks || [],
        taskHistory: tasksData.taskHistory || [],
        referralCount: referralData.totalReferrals || 0
      }))
    } catch (error) {
      console.error('Error refreshing tasks:', error)
    }
  }, [appData.userData?.id])

  // Sadece mağaza verilerini yenile
  const refreshShop = useCallback(async () => {
    if (!appData.userData?.id) return

    try {
      const [shopItemsRes, purchasesRes] = await Promise.all([
        fetch('/api/shop/items'),
        fetch(`/api/user/${appData.userData.id}/purchases`)
      ])

      const shopItemsData = await shopItemsRes.json()
      const purchasesData = await purchasesRes.json()

      setAppData(prev => ({
        ...prev,
        shopItems: shopItemsData.items || [],
        purchases: purchasesData.purchases || []
      }))
    } catch (error) {
      console.error('Error refreshing shop:', error)
    }
  }, [appData.userData?.id])

  // Tüm verileri yenile
  const refreshAll = useCallback(async () => {
    if (!appData.userData?.id) return
    await fetchAllData(appData.userData.id)
  }, [appData.userData?.id, fetchAllData])

  // Telegram kullanıcısı değiştiğinde verileri yükle
  useEffect(() => {
    if (telegramUser) {
      fetchAllData(telegramUser.id.toString())
    }
  }, [telegramUser, fetchAllData])

  // Arka planda periyodik yenileme (her 30 saniyede bir)
  useEffect(() => {
    if (!appData.userData?.id) return

    const interval = setInterval(() => {
      refreshUserData() // Sadece kullanıcı verisini sessizce yenile
    }, 30000) // 30 saniye

    return () => clearInterval(interval)
  }, [appData.userData?.id, refreshUserData])

  const value: UserContextType = {
    telegramUser,
    appData,
    loading,
    initializing,
    setTelegramUser,
    refreshUserData,
    refreshTasks,
    refreshShop,
    refreshAll
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}
