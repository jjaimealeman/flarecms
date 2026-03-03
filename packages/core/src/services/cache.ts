/**
 * Simple Cache Service
 *
 * Two-tiered caching: in-memory (Tier 1) + optional KV (Tier 2)
 * KV is wired at runtime via setGlobalKVNamespace() middleware in app.ts
 */

export interface CacheConfig {
  ttl: number // Time to live in seconds
  keyPrefix: string
}

/**
 * Module-level KV namespace — set once per Workers isolate via setGlobalKVNamespace()
 */
let globalKVNamespace: KVNamespace | undefined

/**
 * Set the global KV namespace for all CacheService instances (Tier 2)
 * Called from app.ts middleware before any route handler runs.
 */
export function setGlobalKVNamespace(kv: KVNamespace): void {
  globalKVNamespace = kv
}

export class CacheService {
  private config: CacheConfig
  private memoryCache: Map<string, { value: any; expires: number }> = new Map()

  constructor(config: CacheConfig) {
    this.config = config
  }

  /**
   * Generate cache key with prefix
   */
  generateKey(type: string, identifier?: string): string {
    const parts = [this.config.keyPrefix, type]
    if (identifier) {
      parts.push(identifier)
    }
    return parts.join(':')
  }

  /**
   * Get value from cache (memory first, then KV)
   */
  async get<T>(key: string): Promise<T | null> {
    // Tier 1: Memory
    const cached = this.memoryCache.get(key)
    if (cached) {
      if (Date.now() > cached.expires) {
        this.memoryCache.delete(key)
      } else {
        return cached.value as T
      }
    }

    // Tier 2: KV
    if (globalKVNamespace) {
      try {
        const kvValue = await globalKVNamespace.get(key, 'json')
        if (kvValue !== null) {
          // Backfill memory cache
          const expires = Date.now() + (this.config.ttl * 1000)
          this.memoryCache.set(key, { value: kvValue, expires })
          return kvValue as T
        }
      } catch {
        // KV read failed — fall through to miss
      }
    }

    return null
  }

  /**
   * Get value from cache with source information
   */
  async getWithSource<T>(key: string): Promise<{
    hit: boolean
    data: T | null
    source: string
    ttl?: number
  }> {
    // Tier 1: Memory
    const cached = this.memoryCache.get(key)
    if (cached) {
      if (Date.now() > cached.expires) {
        this.memoryCache.delete(key)
        return {
          hit: false,
          data: null,
          source: 'expired'
        }
      } else {
        return {
          hit: true,
          data: cached.value as T,
          source: 'memory',
          ttl: (cached.expires - Date.now()) / 1000
        }
      }
    }

    // Tier 2: KV
    if (globalKVNamespace) {
      try {
        const kvValue = await globalKVNamespace.get(key, 'json')
        if (kvValue !== null) {
          // Backfill memory cache
          const expires = Date.now() + (this.config.ttl * 1000)
          this.memoryCache.set(key, { value: kvValue, expires })
          return {
            hit: true,
            data: kvValue as T,
            source: 'kv',
            ttl: this.config.ttl
          }
        }
      } catch {
        // KV read failed — fall through to miss
      }
    }

    return {
      hit: false,
      data: null,
      source: 'none'
    }
  }

  /**
   * Set value in cache (stores in both memory and KV)
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    const effectiveTtl = ttl || this.config.ttl
    const expires = Date.now() + (effectiveTtl * 1000)

    // Tier 1: Memory
    this.memoryCache.set(key, { value, expires })

    // Tier 2: KV (non-blocking write)
    if (globalKVNamespace) {
      try {
        await globalKVNamespace.put(key, JSON.stringify(value), {
          expirationTtl: effectiveTtl
        })
      } catch {
        // KV write failed — memory cache still holds value
      }
    }
  }

  /**
   * Delete specific key from cache (both tiers)
   */
  async delete(key: string): Promise<void> {
    this.memoryCache.delete(key)

    if (globalKVNamespace) {
      try {
        await globalKVNamespace.delete(key)
      } catch {
        // KV delete failed — best effort
      }
    }
  }

  /**
   * Invalidate cache keys matching a pattern (both tiers)
   */
  async invalidate(pattern: string): Promise<void> {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.')
    const regex = new RegExp(`^${regexPattern}$`)

    // Tier 1: Memory
    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        this.memoryCache.delete(key)
      }
    }

    // Tier 2: KV — list keys with prefix and delete matching
    if (globalKVNamespace) {
      try {
        const prefix = this.config.keyPrefix + ':'
        const list = await globalKVNamespace.list({ prefix })
        for (const kvKey of list.keys) {
          if (regex.test(kvKey.name)) {
            await globalKVNamespace.delete(kvKey.name)
          }
        }
      } catch {
        // KV invalidation failed — memory already cleared
      }
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    this.memoryCache.clear()
  }

  /**
   * Get value from cache or set it using a callback
   */
  async getOrSet<T>(key: string, callback: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = await this.get<T>(key)

    if (cached !== null) {
      return cached
    }

    const value = await callback()
    await this.set(key, value, ttl)
    return value
  }
}

/**
 * Cache configurations for different data types
 */
export const CACHE_CONFIGS = {
  api: {
    ttl: 300, // 5 minutes
    keyPrefix: 'api'
  },
  user: {
    ttl: 600, // 10 minutes
    keyPrefix: 'user'
  },
  content: {
    ttl: 300, // 5 minutes
    keyPrefix: 'content'
  },
  collection: {
    ttl: 600, // 10 minutes
    keyPrefix: 'collection'
  }
}

/**
 * Singleton cache instances by key prefix
 */
const cacheInstances = new Map<string, CacheService>()

/**
 * Get or create a cache service instance for a config (singleton per keyPrefix)
 */
export function getCacheService(config: CacheConfig): CacheService {
  if (!cacheInstances.has(config.keyPrefix)) {
    cacheInstances.set(config.keyPrefix, new CacheService(config))
  }
  return cacheInstances.get(config.keyPrefix)!
}
