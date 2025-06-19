import { logger } from "@demo/shared";
import { MetricsService } from "./metrics-service";

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string; // Key prefix
  namespace?: string; // Cache namespace
}

export interface CacheItem<T = any> {
  value: T;
  timestamp: number;
  ttl: number;
  expiresAt: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  keys: number;
  memoryUsage: number;
  hitRate: number;
}

export abstract class CacheBackend {
  abstract get<T>(key: string): Promise<T | null>;
  abstract set<T>(key: string, value: T, ttl?: number): Promise<void>;
  abstract delete(key: string): Promise<boolean>;
  abstract clear(): Promise<void>;
  abstract keys(pattern?: string): Promise<string[]>;
  abstract exists(key: string): Promise<boolean>;
  abstract getStats(): Promise<CacheStats>;
}

/**
 * In-memory cache backend
 */
export class MemoryCacheBackend extends CacheBackend {
  private store: Map<string, CacheItem> = new Map();
  private stats = { hits: 0, misses: 0, keys: 0, memoryUsage: 0, hitRate: 0 };

  async get<T>(key: string): Promise<T | null> {
    const item = this.store.get(key);

    if (!item) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Check if item has expired
    if (Date.now() > item.expiresAt) {
      this.store.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    this.stats.hits++;
    this.updateHitRate();
    return item.value as T;
  }

  async set<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
    const timestamp = Date.now();
    const expiresAt = timestamp + ttl * 1000;

    this.store.set(key, {
      value,
      timestamp,
      ttl,
      expiresAt,
    });

    this.stats.keys = this.store.size;
    this.updateMemoryUsage();
  }

  async delete(key: string): Promise<boolean> {
    const deleted = this.store.delete(key);
    if (deleted) {
      this.stats.keys = this.store.size;
      this.updateMemoryUsage();
    }
    return deleted;
  }

  async clear(): Promise<void> {
    this.store.clear();
    this.stats.keys = 0;
    this.stats.memoryUsage = 0;
  }

  async keys(pattern?: string): Promise<string[]> {
    const keys = Array.from(this.store.keys());

    if (!pattern) {
      return keys;
    }

    const regex = new RegExp(pattern.replace(/\*/g, ".*"));
    return keys.filter((key) => regex.test(key));
  }

  async exists(key: string): Promise<boolean> {
    const item = this.store.get(key);
    if (!item) return false;

    // Check if expired
    if (Date.now() > item.expiresAt) {
      this.store.delete(key);
      return false;
    }

    return true;
  }

  async getStats(): Promise<CacheStats> {
    return { ...this.stats };
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  private updateMemoryUsage(): void {
    // Rough estimation of memory usage
    let usage = 0;
    for (const [key, item] of this.store.entries()) {
      usage += key.length;
      usage += JSON.stringify(item.value).length;
      usage += 100; // Overhead for object structure
    }
    this.stats.memoryUsage = usage;
  }

  /**
   * Clean up expired items
   */
  cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, item] of this.store.entries()) {
      if (now > item.expiresAt) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach((key) => this.store.delete(key));

    if (expiredKeys.length > 0) {
      this.stats.keys = this.store.size;
      this.updateMemoryUsage();
      logger.debug("Cleaned up expired cache items", {
        count: expiredKeys.length,
      });
    }
  }
}

/**
 * Redis cache backend (placeholder for future implementation)
 */
export class RedisCacheBackend extends CacheBackend {
  private redis: any; // Redis client would be injected here

  constructor(redisClient: any) {
    super();
    this.redis = redisClient;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error("Redis get error", {
        error: error instanceof Error ? error.message : String(error),
        key,
      });
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      logger.error("Redis set error", {
        error: error instanceof Error ? error.message : String(error),
        key,
      });
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const result = await this.redis.del(key);
      return result > 0;
    } catch (error) {
      logger.error("Redis delete error", {
        error: error instanceof Error ? error.message : String(error),
        key,
      });
      return false;
    }
  }

  async clear(): Promise<void> {
    try {
      await this.redis.flushdb();
    } catch (error) {
      logger.error("Redis clear error", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async keys(pattern?: string): Promise<string[]> {
    try {
      const patternToUse = pattern || "*";
      return await this.redis.keys(patternToUse);
    } catch (error) {
      logger.error("Redis keys error", {
        error: error instanceof Error ? error.message : String(error),
        pattern,
      });
      return [];
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result > 0;
    } catch (error) {
      logger.error("Redis exists error", {
        error: error instanceof Error ? error.message : String(error),
        key,
      });
      return false;
    }
  }

  async getStats(): Promise<CacheStats> {
    try {
      const info = await this.redis.info("stats");
      // Parse Redis info to extract stats
      // This is a simplified implementation
      return {
        hits: 0,
        misses: 0,
        keys: 0,
        memoryUsage: 0,
        hitRate: 0,
      };
    } catch (error) {
      logger.error("Redis stats error", {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        hits: 0,
        misses: 0,
        keys: 0,
        memoryUsage: 0,
        hitRate: 0,
      };
    }
  }
}

/**
 * Main cache service
 */
export class CacheService {
  private backend: CacheBackend;
  private metricsService: MetricsService;
  private defaultTtl: number;
  private prefix: string;
  private namespace: string;

  constructor(backend: CacheBackend, options: CacheOptions = {}) {
    this.backend = backend;
    this.metricsService = new MetricsService();
    this.defaultTtl = options.ttl || 3600; // 1 hour default
    this.prefix = options.prefix || "cache";
    this.namespace = options.namespace || "default";

    // Setup cleanup for memory backend
    if (backend instanceof MemoryCacheBackend) {
      setInterval(() => backend.cleanup(), 5 * 60 * 1000); // Clean every 5 minutes
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const fullKey = this.buildKey(key);

    try {
      const startTime = Date.now();
      const value = await this.backend.get<T>(fullKey);
      const duration = Date.now() - startTime;

      if (value !== null) {
        await this.metricsService.recordCacheHit("get", duration);
        logger.debug("Cache hit", { key: fullKey, duration });
      } else {
        await this.metricsService.recordCacheMiss("get", duration);
        logger.debug("Cache miss", { key: fullKey, duration });
      }

      return value;
    } catch (error) {
      logger.error("Cache get error", {
        error: error instanceof Error ? error.message : String(error),
        key: fullKey,
      });
      await this.metricsService.recordError(
        "CACHE_ERROR",
        "500",
        "cache_service"
      );
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const fullKey = this.buildKey(key);
    const ttlToUse = ttl || this.defaultTtl;

    try {
      const startTime = Date.now();
      await this.backend.set(fullKey, value, ttlToUse);
      const duration = Date.now() - startTime;

      await this.metricsService.recordCacheOperation("set", duration);
      logger.debug("Cache set", { key: fullKey, ttl: ttlToUse, duration });
    } catch (error) {
      logger.error("Cache set error", {
        error: error instanceof Error ? error.message : String(error),
        key: fullKey,
      });
      await this.metricsService.recordError(
        "CACHE_ERROR",
        "500",
        "cache_service"
      );
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    const fullKey = this.buildKey(key);

    try {
      const startTime = Date.now();
      const result = await this.backend.delete(fullKey);
      const duration = Date.now() - startTime;

      await this.metricsService.recordCacheOperation("delete", duration);
      logger.debug("Cache delete", { key: fullKey, result, duration });

      return result;
    } catch (error) {
      logger.error("Cache delete error", {
        error: error instanceof Error ? error.message : String(error),
        key: fullKey,
      });
      await this.metricsService.recordError(
        "CACHE_ERROR",
        "500",
        "cache_service"
      );
      return false;
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    try {
      const startTime = Date.now();
      await this.backend.clear();
      const duration = Date.now() - startTime;

      await this.metricsService.recordCacheOperation("clear", duration);
      logger.info("Cache cleared", { duration });
    } catch (error) {
      logger.error("Cache clear error", {
        error: error instanceof Error ? error.message : String(error),
      });
      await this.metricsService.recordError(
        "CACHE_ERROR",
        "500",
        "cache_service"
      );
    }
  }

  /**
   * Get cache keys matching pattern
   */
  async keys(pattern?: string): Promise<string[]> {
    const fullPattern = pattern
      ? this.buildKey(pattern)
      : `${this.prefix}:${this.namespace}:*`;

    try {
      const keys = await this.backend.keys(fullPattern);
      return keys.map((key) => this.stripKey(key));
    } catch (error) {
      logger.error("Cache keys error", {
        error: error instanceof Error ? error.message : String(error),
        pattern: fullPattern,
      });
      return [];
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const fullKey = this.buildKey(key);

    try {
      return await this.backend.exists(fullKey);
    } catch (error) {
      logger.error("Cache exists error", {
        error: error instanceof Error ? error.message : String(error),
        key: fullKey,
      });
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    try {
      return await this.backend.getStats();
    } catch (error) {
      logger.error("Cache stats error", {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        hits: 0,
        misses: 0,
        keys: 0,
        memoryUsage: 0,
        hitRate: 0,
      };
    }
  }

  /**
   * Get or set value with automatic caching
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);

    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }

  /**
   * Invalidate cache entries matching pattern
   */
  async invalidate(pattern: string): Promise<number> {
    try {
      const keys = await this.keys(pattern);
      let deletedCount = 0;

      for (const key of keys) {
        if (await this.delete(key)) {
          deletedCount++;
        }
      }

      logger.info("Cache invalidated", { pattern, deletedCount });
      return deletedCount;
    } catch (error) {
      logger.error("Cache invalidate error", {
        error: error instanceof Error ? error.message : String(error),
        pattern,
      });
      return 0;
    }
  }

  /**
   * Build full cache key
   */
  private buildKey(key: string): string {
    return `${this.prefix}:${this.namespace}:${key}`;
  }

  /**
   * Strip prefix and namespace from key
   */
  private stripKey(fullKey: string): string {
    const parts = fullKey.split(":");
    return parts.slice(2).join(":");
  }
}

/**
 * Factory functions for creating cache services
 */
export class CacheServiceFactory {
  /**
   * Create memory-based cache service
   */
  static createMemoryCache(options?: CacheOptions): CacheService {
    const backend = new MemoryCacheBackend();
    return new CacheService(backend, options);
  }

  /**
   * Create Redis-based cache service
   */
  static createRedisCache(
    redisClient: any,
    options?: CacheOptions
  ): CacheService {
    const backend = new RedisCacheBackend(redisClient);
    return new CacheService(backend, options);
  }

  /**
   * Create cache service based on environment
   */
  static createForEnvironment(
    environment: string,
    options?: CacheOptions
  ): CacheService {
    switch (environment) {
      case "production":
        // In production, you'd typically use Redis
        // For now, fall back to memory cache
        return this.createMemoryCache(options);

      case "staging":
        return this.createMemoryCache(options);

      case "development":
      default:
        return this.createMemoryCache(options);
    }
  }
}
