import { useQuery } from '@tanstack/react-query'

interface VisitStats {
  totalVisits: number
  todayVisits: number
  uniqueVisitors: number
}

async function fetchVisitStats() {
  const response = await fetch('/api/visit/count')
  if (!response.ok) throw new Error('Failed to fetch visit stats')
  return response.json() as Promise<VisitStats>
}

export function useVisitStats() {
  return useQuery({
    queryKey: ['visitStats'],
    queryFn: fetchVisitStats,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
