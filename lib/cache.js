"use client";

/**
 * Client-side caching utility for performance optimization
 * Implements LRU cache with TTL support
 */

class CacheManager {
  constructor(maxSize = 100, defaultTTL = 3600000) {
    // 1 hour default
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    this.cache = new Map();
    this.accessOrder = [];
  }

  /**
   * Get item from cache
   */
  get(key) {
    if (!this.cache.has(key)) {
      return null;
    }

    const item = this.cache.get(key);

    // Check if expired
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      return null;
    }

    // Update access order (move to end)
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);

    return item.value;
  }

  /**
   * Set item in cache
   */
  set(key, value, ttl = this.defaultTTL) {
    // If key exists, remove from access order
    if (this.cache.has(key)) {
      this.removeFromAccessOrder(key);
    }

    // If cache is full, remove least recently used
    if (
      this.cache.size >= this.maxSize &&
      !this.cache.has(key)
    ) {
      const lruKey = this.accessOrder.shift();
      this.cache.delete(lruKey);
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });

    this.accessOrder.push(key);
  }

  /**
   * Remove item from cache
   */
  remove(key) {
    this.cache.delete(key);
    this.removeFromAccessOrder(key);
  }

  /**
   * Clear entire cache
   */
  clear() {
    this.cache.clear();
    this.accessOrder = [];
  }

  /**
   * Helper to remove from access order array
   */
  removeFromAccessOrder(key) {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      utilizationPercent: Math.round((this.cache.size / this.maxSize) * 100),
    };
  }
}

// Create instances for different cache types
export const movieCache = new CacheManager(50, 3600000); // 1 hour
export const searchCache = new CacheManager(100, 1800000); // 30 minutes
export const userCache = new CacheManager(20, 1800000); // 30 minutes

/**
 * Cache API responses with automatic expiration
 */
export async function cachedFetch(url, options = {}, ttl = 1800000) {
  const cacheKey = `${url}-${JSON.stringify(options)}`;
  const cached = searchCache.get(cacheKey);

  if (cached) {
    console.log(`Cache hit for ${url}`);
    return cached;
  }

  console.log(`Cache miss for ${url}`);
  const response = await fetch(url, options);
  const data = await response.json();

  searchCache.set(cacheKey, data, ttl);
  return data;
}

/**
 * Preload and cache content
 */
export function preloadContent(contentIds) {
  if (typeof window === "undefined") return;

  contentIds.forEach((id) => {
    const img = new Image();
    img.src = `/api/content/${id}/thumbnail`;
  });
}

/**
 * Storage utilities for persistent cache
 */
export const storageCache = {
  set(key, value, ttl = 86400000) {
    // 24 hours default
    try {
      const item = {
        value,
        expiresAt: Date.now() + ttl,
      };
      localStorage.setItem(key, JSON.stringify(item));
    } catch (err) {
      console.error("Storage cache set error:", err);
    }
  },

  get(key) {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;

      const parsed = JSON.parse(item);
      if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
        localStorage.removeItem(key);
        return null;
      }

      return parsed.value;
    } catch (err) {
      console.error("Storage cache get error:", err);
      return null;
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (err) {
      console.error("Storage cache remove error:", err);
    }
  },

  clear() {
    try {
      localStorage.clear();
    } catch (err) {
      console.error("Storage cache clear error:", err);
    }
  },
};

/**
 * Network-first with cache fallback strategy
 */
export async function networkFirstFetch(url, options = {}) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error("Network error");

    const data = await response.json();
    searchCache.set(url, data);
    return data;
  } catch (err) {
    // Fall back to cache
    const cached = searchCache.get(url);
    if (cached) {
      console.log(`Using cached data for ${url}`);
      return cached;
    }

    throw err;
  }
}

/**
 * Cache-first with network update strategy
 */
export async function cacheFirstFetch(url, options = {}) {
  const cached = searchCache.get(url);
  if (cached) {
    return cached;
  }

  const response = await fetch(url, options);
  const data = await response.json();
  searchCache.set(url, data);
  return data;
}
