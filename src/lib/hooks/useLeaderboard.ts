import { useQuery } from '@tanstack/react-query'

interface LeaderboardUser {
  id: string
  siteUsername?: string
  username?: string
  firstName?: string
  photoUrl?: string
  points: number
  xp: number
  totalMessages: number
  rank?: {
    name: string
    icon: string
  }
  position: number
}

interface LeaderboardData {
  leaderboard: LeaderboardUser[]
  currentUser: LeaderboardUser | null
  totalUsers: number
}

async function fetchLeaderboard(sortBy: 'points' | 'xp', userId?: string) {
  const params = new URLSearchParams({ sortBy })
  if (userId) params.append('userId', userId)

  const response = await fetch(`/api/leaderboard?${params.toString()}`)
  if (!response.ok) throw new Error('Failed to fetch leaderboard')
  return response.json() as Promise<LeaderboardData>
}

export function useLeaderboard(sortBy: 'points' | 'xp' = 'points', userId?: string) {
  return useQuery({
    queryKey: ['leaderboard', sortBy, userId],
    queryFn: () => fetchLeaderboard(sortBy, userId),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
