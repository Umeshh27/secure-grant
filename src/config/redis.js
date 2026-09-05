const Redis = require('ioredis');
const env = require('./env');

let redisClient = null;
let isConnected = false;

// In-memory fallback map if Redis is temporarily unreachable or in mock mode
const fallbackMemoryCache = new Map();

if (env.NODE_ENV !== 'test') {
  try {
    const redisOptions = {
      host: env.REDIS.HOST,
      port: env.REDIS.PORT,
      retryStrategy: (times) => {
        const delay = Math.min(times * 200, 3000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      connectTimeout: 3000,
      lazyConnect: true,
    };

    redisClient = env.REDIS.URL && env.REDIS.URL.startsWith('redis://')
      ? new Redis(env.REDIS.URL, redisOptions)
      : new Redis(redisOptions);

    redisClient.on('connect', () => {
      isConnected = true;
      console.log('[Redis] Connected successfully to Redis server');
    });

    redisClient.on('ready', () => {
      isConnected = true;
    });

    redisClient.on('error', (err) => {
      isConnected = false;
      console.warn(`[Redis] Connection notice: ${err.message}. Using cache fallback.`);
    });

    redisClient.on('close', () => {
      isConnected = false;
    });

    // Attempt initial connect asynchronously
    redisClient.connect().catch(() => {
      isConnected = false;
    });
  } catch (err) {
    isConnected = false;
    console.warn('[Redis] Initialization warning:', err.message);
  }
}

/**
 * Cache operations wrapper with graceful degradation
 */
const cache = {
  /**
   * Get value from cache
   * @param {string} key 
   * @returns {Promise<any|null>}
   */
  async get(key) {
    try {
      if (isConnected && redisClient) {
        const val = await redisClient.get(key);
        return val ? JSON.parse(val) : null;
      }
    } catch (e) {
      // Fallback
    }
    const mem = fallbackMemoryCache.get(key);
    if (!mem) return null;
    if (mem.expiresAt && Date.now() > mem.expiresAt) {
      fallbackMemoryCache.delete(key);
      return null;
    }
    return mem.value;
  },

  /**
   * Set value in cache with optional TTL in seconds
   * @param {string} key 
   * @param {any} value 
   * @param {number} ttlSeconds 
   */
  async set(key, value, ttlSeconds = 300) {
    const stringVal = JSON.stringify(value);
    try {
      if (isConnected && redisClient) {
        if (ttlSeconds) {
          await redisClient.set(key, stringVal, 'EX', ttlSeconds);
        } else {
          await redisClient.set(key, stringVal);
        }
        return true;
      }
    } catch (e) {
      // Fallback
    }
    fallbackMemoryCache.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + (ttlSeconds * 1000) : null
    });
    return true;
  },

  /**
   * Delete key from cache
   * @param {string} key 
   */
  async del(key) {
    try {
      if (isConnected && redisClient) {
        await redisClient.del(key);
      }
    } catch (e) {
      // Fallback
    }
    fallbackMemoryCache.delete(key);
    return true;
  },

  /**
   * Delete keys matching a pattern (e.g. 'grants:*')
   * @param {string} pattern 
   */
  async delPattern(pattern) {
    try {
      if (isConnected && redisClient) {
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
          await redisClient.del(...keys);
        }
      }
    } catch (e) {
      // Fallback
    }
    const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
    for (const k of fallbackMemoryCache.keys()) {
      if (regex.test(k)) {
        fallbackMemoryCache.delete(k);
      }
    }
    return true;
  },

  /**
   * Check Redis health status
   * @returns {Promise<boolean>}
   */
  async checkHealth() {
    try {
      if (isConnected && redisClient) {
        const res = await redisClient.ping();
        return res === 'PONG';
      }
    } catch (e) {
      return false;
    }
    return isConnected;
  },

  /**
   * Close redis connection cleanly
   */
  async close() {
    if (redisClient) {
      try {
        await redisClient.quit();
      } catch (e) {
        redisClient.disconnect();
      }
    }
  }
};

module.exports = {
  redisClient,
  cache,
};
