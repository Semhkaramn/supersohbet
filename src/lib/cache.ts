// Simple in-memory cache for frequently accessed data
// This prevents repeated database queries for data that rarely changes

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class SimpleCache {
  private cache: Map<string, CacheEntry<any>> = new Map()

  set<T>(key: string, data: T, ttlSeconds: number = 300): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) return null

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }
}

// Singleton instance
export const cache = new SimpleCache()

// Cleanup expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => cache.cleanup(), 5 * 60 * 1000)
}

// Helper functions for common cache patterns

export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 300
): Promise<T> {
  // Try to get from cache
  const cached = cache.get<T>(key)
  if (cached !== null) {
    return cached
  }

  // Fetch fresh data
  const data = await fetcher()
  cache.set(key, data, ttlSeconds)
  return data
}

// Settings cache helpers
export async function getCachedSettings(
  fetcher: () => Promise<any>,
  ttlSeconds: number = 3600 // 1 hour default
): Promise<any> {
  return getCached('app_settings', fetcher, ttlSeconds)
}

export function invalidateSettingsCache(): void {
  cache.delete('app_settings')
}

// User profile photo cache
export async function getCachedUserPhoto(
  userId: string,
  fetcher: () => Promise<string | null>,
  ttlSeconds: number = 86400 // 24 hours
): Promise<string | null> {
  return getCached(`user_photo_${userId}`, fetcher, ttlSeconds)
}

export function invalidateUserPhotoCache(userId: string): void {
  cache.delete(`user_photo_${userId}`)
}

// Leaderboard cache
export async function getCachedLeaderboard(
  sortBy: string,
  fetcher: () => Promise<any>,
  ttlSeconds: number = 300 // 5 minutes
): Promise<any> {
  return getCached(`leaderboard_${sortBy}`, fetcher, ttlSeconds)
}

export function invalidateLeaderboardCache(): void {
  cache.delete('leaderboard_points')
  cache.delete('leaderboard_xp')
}
