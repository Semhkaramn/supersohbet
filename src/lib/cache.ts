/**
 * ✅ REFACTORED: Cache sistemi enhanced-cache'e yönlendirildi
 * Bu dosya geriye uyumluluk için korunuyor
 */

import {
  enhancedCache,
  getCachedData,
  CacheKeys,
  CacheTags,
  invalidateCache,
  CacheTTL,
  CacheStrategy
} from './enhanced-cache'

// ✅ Backward compatibility - eski API'yi koruyoruz
export const cache = {
  get: <T>(key: string) => enhancedCache.get<T>(key),
  set: <T>(key: string, data: T, ttlSeconds: number = 300) =>
    enhancedCache.set(key, data, ttlSeconds),
  has: (key: string) => enhancedCache.has(key),
  delete: (key: string) => enhancedCache.delete(key),
  clear: () => enhancedCache.clear(),
  cleanup: () => enhancedCache.cleanup()
}

// ✅ Helper functions - enhanced-cache'i kullanarak
export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 300
): Promise<T> {
  return getCachedData(key, fetcher, { ttl: ttlSeconds })
}

// Settings cache helpers
export async function getCachedSettings(
  fetcher: () => Promise<any>,
  ttlSeconds: number = 3600
): Promise<any> {
  return getCachedData(
    'app_settings',
    fetcher,
    { ttl: ttlSeconds, tags: [CacheTags.SETTINGS] }
  )
}

export function invalidateSettingsCache(): void {
  invalidateCache.settings()
}

// User profile photo cache
export async function getCachedUserPhoto(
  userId: string,
  fetcher: () => Promise<string | null>,
  ttlSeconds: number = 86400
): Promise<string | null> {
  return getCachedData(
    CacheKeys.USER(userId),
    fetcher,
    { ttl: ttlSeconds, tags: [CacheTags.USER] }
  )
}

export function invalidateUserPhotoCache(userId: string): void {
  enhancedCache.delete(CacheKeys.USER(userId))
}

// Leaderboard cache
export async function getCachedLeaderboard(
  sortBy: string,
  fetcher: () => Promise<any>,
  ttlSeconds: number = 300
): Promise<any> {
  return getCachedData(
    CacheKeys.LEADERBOARD(sortBy),
    fetcher,
    { ttl: ttlSeconds, tags: [CacheTags.LEADERBOARD] }
  )
}

export function invalidateLeaderboardCache(): void {
  invalidateCache.leaderboard()
}
