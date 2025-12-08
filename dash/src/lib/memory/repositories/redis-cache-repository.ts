import { createClient, RedisClientType } from 'redis';
import { createHash } from 'crypto';
import { CacheRepository } from './interfaces';
import { CachedResponse } from '../types';

export class RedisCacheRepository implements CacheRepository {
  private client: RedisClientType;
  private isConnected: boolean = false;
  private stats = { hits: 0, misses: 0 };

  constructor(config?: {
    url?: string;
    host?: string;
    port?: number;
    password?: string;
    db?: number;
  }) {
    const defaultConfig = {
      url: process.env.REDIS_URL,
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0')
    };

    const finalConfig = { ...defaultConfig, ...config };

    this.client = createClient({
      url: finalConfig.url || `redis://${finalConfig.host}:${finalConfig.port}/${finalConfig.db}`,
      password: finalConfig.password,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 1000)
      }
    });

    // Handle Redis events
    this.client.on('connect', () => {
      console.log('🔗 Redis client connecting...');
    });

    this.client.on('ready', () => {
      console.log('✅ Redis client ready');
      this.isConnected = true;
    });

    this.client.on('error', (err) => {
      console.error('❌ Redis client error:', err);
      this.isConnected = false;
    });

    this.client.on('end', () => {
      console.log('🔌 Redis client disconnected');
      this.isConnected = false;
    });
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      try {
        await this.client.connect();
      } catch (error) {
        console.error('Failed to connect to Redis:', error);
        throw error;
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      try {
        await this.client.disconnect();
      } catch (error) {
        console.error('Error disconnecting from Redis:', error);
        throw error;
      }
    }
  }

  // Semantic caching with similarity search
  async get(query: string, userId: string, similarityThreshold: number = 0.85): Promise<CachedResponse | null> {
    try {
      const queryHash = this.hashQuery(query);
      const cacheKey = `semantic_cache:${userId}:${queryHash}`;
      
      // First try exact match
      const cached = await this.client.get(cacheKey);
      if (cached) {
        this.stats.hits++;
        const parsed = JSON.parse(cached);
        // Update hit count
        await this.client.hIncrBy(`cache_stats:${userId}:${queryHash}`, 'hits', 1);
        return {
          ...parsed,
          similarity: 1.0 // Exact match
        };
      }

      // TODO: Implement vector similarity search for near-matches
      // This would require Redis with vector capabilities or external vector search
      // For now, we'll just do exact matches

      this.stats.misses++;
      return null;
    } catch (error) {
      console.error('Error getting cached response:', error);
      return null;
    }
  }

  async set(query: string, response: any, userId: string, ttl: number = 3600): Promise<void> {
    try {
      const queryHash = this.hashQuery(query);
      const cacheKey = `semantic_cache:${userId}:${queryHash}`;
      
      const cacheData: CachedResponse = {
        id: queryHash,
        query,
        response,
        embedding: [], // TODO: Store actual embedding
        userId,
        similarity: 1.0,
        timestamp: new Date(),
        hitCount: 0
      };

      // Store the cached response
      await this.client.setEx(cacheKey, ttl, JSON.stringify(cacheData));
      
      // Initialize hit counter
      await this.client.hSet(`cache_stats:${userId}:${queryHash}`, {
        hits: '0',
        created: Date.now().toString()
      });

      // Add to user's cache index for cleanup
      await this.client.sAdd(`user_cache_keys:${userId}`, cacheKey);
      
    } catch (error) {
      console.error('Error setting cached response:', error);
      throw error;
    }
  }

  // General purpose caching
  async getValue(key: string): Promise<any | null> {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Error getting value:', error);
      return null;
    }
  }

  async setValue(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.client.setEx(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (error) {
      console.error('Error setting value:', error);
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      console.error('Error deleting key:', error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      await this.client.flushDb();
      this.stats.hits = 0;
      this.stats.misses = 0;
    } catch (error) {
      console.error('Error clearing cache:', error);
      throw error;
    }
  }

  async getStats(): Promise<{ hits: number; misses: number; hitRate: number }> {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? this.stats.hits / total : 0;
    
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: hitRate
    };
  }

  // Cache management methods
  async getUserCacheSize(userId: string): Promise<number> {
    try {
      const keys = await this.client.sMembers(`user_cache_keys:${userId}`);
      return keys.length;
    } catch (error) {
      console.error('Error getting user cache size:', error);
      return 0;
    }
  }

  async clearUserCache(userId: string): Promise<void> {
    try {
      const keys = await this.client.sMembers(`user_cache_keys:${userId}`);
      if (keys.length > 0) {
        await this.client.del(keys);
        await this.client.del(`user_cache_keys:${userId}`);
      }
    } catch (error) {
      console.error('Error clearing user cache:', error);
      throw error;
    }
  }

  // Active session management
  async setActiveSession(userId: string, sessionData: any, ttl: number = 3600): Promise<void> {
    const sessionKey = `active_session:${userId}`;
    await this.setValue(sessionKey, sessionData, ttl);
  }

  async getActiveSession(userId: string): Promise<any | null> {
    const sessionKey = `active_session:${userId}`;
    return this.getValue(sessionKey);
  }

  async extendSession(userId: string, ttl: number = 3600): Promise<void> {
    const sessionKey = `active_session:${userId}`;
    await this.client.expire(sessionKey, ttl);
  }

  // Tool usage caching
  async cacheToolResult(toolId: string, userId: string, params: any, result: any, ttl: number = 900): Promise<void> {
    const paramsHash = this.hashQuery(JSON.stringify(params));
    const cacheKey = `tool_cache:${toolId}:${userId}:${paramsHash}`;
    
    await this.setValue(cacheKey, {
      params,
      result,
      timestamp: new Date(),
      toolId,
      userId
    }, ttl);
  }

  async getCachedToolResult(toolId: string, userId: string, params: any): Promise<any | null> {
    const paramsHash = this.hashQuery(JSON.stringify(params));
    const cacheKey = `tool_cache:${toolId}:${userId}:${paramsHash}`;
    
    return this.getValue(cacheKey);
  }

  // Rate limiting
  async checkRateLimit(key: string, maxRequests: number, windowSeconds: number): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    try {
      const now = Math.floor(Date.now() / 1000);
      const window = Math.floor(now / windowSeconds);
      const rateLimitKey = `rate_limit:${key}:${window}`;
      
      const current = await this.client.incr(rateLimitKey);
      if (current === 1) {
        await this.client.expire(rateLimitKey, windowSeconds);
      }
      
      const remaining = Math.max(0, maxRequests - current);
      const resetTime = (window + 1) * windowSeconds;
      
      return {
        allowed: current <= maxRequests,
        remaining,
        resetTime
      };
    } catch (error) {
      console.error('Error checking rate limit:', error);
      // On error, allow the request
      return { allowed: true, remaining: maxRequests, resetTime: 0 };
    }
  }

  private hashQuery(query: string): string {
    return createHash('sha256').update(query).digest('hex').substring(0, 16);
  }

  // Health check
  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      return false;
    }
  }
}