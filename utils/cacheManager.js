/**
 * Cache Manager
 * Provides in-memory caching for frequently accessed data
 */

import { Logger } from './logger.js';

// Create a logger for cache operations
const logger = new Logger({ category: 'CacheManager' });

/**
 * Cache entry with expiration
 */
class CacheEntry {
  /**
   * Create a new cache entry
   * @param {any} value - The value to cache
   * @param {number} ttl - Time to live in milliseconds
   */
  constructor(value, ttl = 0) {
    this.value = value;
    this.timestamp = Date.now();
    this.ttl = ttl;
  }

  /**
   * Check if the entry is expired
   * @returns {boolean} - True if expired
   */
  isExpired() {
    if (this.ttl === 0) return false; // No expiration
    return Date.now() > this.timestamp + this.ttl;
  }
}

/**
 * Cache manager for application data
 */
class CacheManager {
  /**
   * Create a new cache manager
   * @param {Object} options - Cache options
   * @param {number} options.defaultTTL - Default time to live in milliseconds
   * @param {number} options.maxSize - Maximum number of entries in the cache
   * @param {boolean} options.enabled - Whether the cache is enabled
   */
  constructor(options = {}) {
    this.cache = new Map();
    this.defaultTTL = options.defaultTTL || 5 * 60 * 1000; // 5 minutes
    this.maxSize = options.maxSize || 100;
    this.enabled = options.enabled !== false;
    this.hits = 0;
    this.misses = 0;
    this.stats = {
      gets: 0,
      sets: 0,
      hits: 0,
      misses: 0,
      evictions: 0
    };

    // Start periodic cleanup
    this.startCleanupInterval();
  }

  /**
   * Start periodic cleanup of expired entries
   * @private
   */
  startCleanupInterval() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }

  /**
   * Stop the cleanup interval
   */
  stopCleanupInterval() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    if (!this.enabled) return;

    logger.debug('Running cache cleanup');
    const initialSize = this.cache.size;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.isExpired()) {
        this.cache.delete(key);
        this.stats.evictions++;
      }
    }
    
    logger.debug(`Cache cleanup complete. Removed ${initialSize - this.cache.size} expired entries`);
  }

  /**
   * Get a value from the cache
   * @param {string} key - Cache key
   * @returns {any} - Cached value or undefined if not found
   */
  get(key) {
    if (!this.enabled) return undefined;
    
    this.stats.gets++;
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      logger.debug(`Cache miss for key: ${key}`);
      return undefined;
    }
    
    if (entry.isExpired()) {
      logger.debug(`Cache entry expired for key: ${key}`);
      this.cache.delete(key);
      this.stats.misses++;
      return undefined;
    }
    
    this.stats.hits++;
    logger.debug(`Cache hit for key: ${key}`);
    return entry.value;
  }

  /**
   * Set a value in the cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds (0 for no expiration)
   */
  set(key, value, ttl = this.defaultTTL) {
    if (!this.enabled) return;
    
    this.stats.sets++;
    
    // Check if we need to evict entries
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictOldest();
    }
    
    logger.debug(`Setting cache entry for key: ${key}`);
    this.cache.set(key, new CacheEntry(value, ttl));
  }

  /**
   * Evict the oldest entry from the cache
   * @private
   */
  evictOldest() {
    let oldestKey = null;
    let oldestTimestamp = Infinity;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      logger.debug(`Evicting oldest cache entry: ${oldestKey}`);
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Check if a key exists in the cache
   * @param {string} key - Cache key
   * @returns {boolean} - True if the key exists and is not expired
   */
  has(key) {
    if (!this.enabled) return false;
    
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (entry.isExpired()) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Delete a key from the cache
   * @param {string} key - Cache key
   * @returns {boolean} - True if the key was deleted
   */
  delete(key) {
    if (!this.enabled) return false;
    return this.cache.delete(key);
  }

  /**
   * Clear the entire cache
   */
  clear() {
    if (!this.enabled) return;
    logger.debug('Clearing cache');
    this.cache.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} - Cache statistics
   */
  getStats() {
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: this.stats.gets > 0 ? this.stats.hits / this.stats.gets : 0
    };
  }

  /**
   * Reset cache statistics
   */
  resetStats() {
    this.stats = {
      gets: 0,
      sets: 0,
      hits: 0,
      misses: 0,
      evictions: 0
    };
  }
}

// Create a singleton instance
const globalCache = new CacheManager();

export { CacheManager, globalCache };
