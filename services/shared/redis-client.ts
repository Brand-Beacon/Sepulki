/**
 * Upstash Redis Client
 *
 * Provides Redis connectivity with connection pooling, automatic retries,
 * and built-in patterns for caching, sessions, and real-time features.
 *
 * @module redis-client
 */

import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import redisConfig from '../../config/redis-config.json';

// Types
export interface SessionData {
  userId: string;
  email: string;
  createdAt: number;
  lastActivity: number;
  ipAddress: string;
  userAgent: string;
  permissions: Record<string, boolean>;
}

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
  compress?: boolean;
}

export interface TelemetryData {
  robotId: string;
  timestamp: number;
  metrics: Record<string, any>;
}

export interface RateLimitConfig {
  requests: number;
  window: number; // in seconds
}

// Environment variable validation
const REQUIRED_ENV_VARS = [
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN'
];

function validateEnvironment(): void {
  const missing = REQUIRED_ENV_VARS.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required Redis environment variables: ${missing.join(', ')}\n` +
      'Please configure Upstash Redis credentials in your .env file'
    );
  }
}

// Initialize Redis client
class RedisClient {
  private client: Redis;
  private readOnlyClient: Redis | null = null;
  private rateLimiters: Map<string, Ratelimit> = new Map();
  private isConnected: boolean = false;

  constructor() {
    validateEnvironment();

    // Primary client (read-write)
    this.client = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      automaticDeserialization: true,
      enableAutoPipelining: true,
      retry: {
        retries: redisConfig.connection.maxRetriesPerRequest,
        backoff: (retryCount) => Math.min(retryCount * 100, 3000)
      }
    });

    // Read-only client for read replicas (if configured)
    if (process.env.UPSTASH_REDIS_REST_READONLY_TOKEN) {
      this.readOnlyClient = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_READONLY_TOKEN!,
        automaticDeserialization: true,
        enableAutoPipelining: true
      });
    }

    this.isConnected = true;
  }

  /**
   * Get the primary Redis client
   */
  getClient(): Redis {
    return this.client;
  }

  /**
   * Get the read-only client (falls back to primary if not configured)
   */
  getReadClient(): Redis {
    return this.readOnlyClient || this.client;
  }

  /**
   * Health check
   */
  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis ping failed:', error);
      return false;
    }
  }

  // ========== SESSION MANAGEMENT ==========

  /**
   * Store user session
   */
  async setSession(sessionId: string, data: SessionData): Promise<void> {
    const key = `session:${sessionId}`;
    const ttl = redisConfig.dataStructures.sessions.ttl;

    await this.client.setex(key, ttl, JSON.stringify(data));
  }

  /**
   * Retrieve user session
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    const key = `session:${sessionId}`;
    const data = await this.getReadClient().get<string>(key);

    return data ? JSON.parse(data) : null;
  }

  /**
   * Update session last activity
   */
  async touchSession(sessionId: string): Promise<void> {
    const key = `session:${sessionId}`;
    const session = await this.getSession(sessionId);

    if (session) {
      session.lastActivity = Date.now();
      await this.setSession(sessionId, session);
    }
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<void> {
    const key = `session:${sessionId}`;
    await this.client.del(key);
  }

  /**
   * Delete all sessions for a user
   */
  async deleteUserSessions(userId: string): Promise<void> {
    const pattern = 'session:*';
    const keys = await this.client.keys(pattern);

    for (const key of keys) {
      const session = await this.getSession(key.replace('session:', ''));
      if (session && session.userId === userId) {
        await this.client.del(key);
      }
    }
  }

  // ========== TOKEN MANAGEMENT ==========

  /**
   * Store JWT token mapping
   */
  async setToken(tokenHash: string, userId: string, sessionId: string, expiresAt: number): Promise<void> {
    const key = `token:${tokenHash}`;
    const ttl = Math.floor((expiresAt - Date.now()) / 1000);

    if (ttl > 0) {
      await this.client.setex(key, ttl, JSON.stringify({
        userId,
        sessionId,
        issuedAt: Date.now(),
        expiresAt,
        tokenType: 'jwt'
      }));
    }
  }

  /**
   * Verify token exists and is valid
   */
  async verifyToken(tokenHash: string): Promise<{ userId: string; sessionId: string } | null> {
    const key = `token:${tokenHash}`;
    const data = await this.getReadClient().get<string>(key);

    if (!data) return null;

    const parsed = JSON.parse(data);
    return {
      userId: parsed.userId,
      sessionId: parsed.sessionId
    };
  }

  /**
   * Revoke token
   */
  async revokeToken(tokenHash: string): Promise<void> {
    const key = `token:${tokenHash}`;
    await this.client.del(key);
  }

  // ========== API CACHING ==========

  /**
   * Cache API response
   */
  async cacheApiResponse(
    endpoint: string,
    queryHash: string,
    data: any,
    options: CacheOptions = {}
  ): Promise<void> {
    const key = `cache:api:${endpoint}:${queryHash}`;
    const ttl = options.ttl || redisConfig.dataStructures.apiCache.ttl;

    const cacheData = {
      data,
      cachedAt: Date.now(),
      tags: options.tags || []
    };

    await this.client.setex(key, ttl, JSON.stringify(cacheData));

    // Store tags for invalidation
    if (options.tags && options.tags.length > 0) {
      for (const tag of options.tags) {
        await this.client.sadd(`cache:tag:${tag}`, key);
      }
    }
  }

  /**
   * Get cached API response
   */
  async getCachedApiResponse<T>(endpoint: string, queryHash: string): Promise<T | null> {
    const key = `cache:api:${endpoint}:${queryHash}`;
    const cached = await this.getReadClient().get<string>(key);

    if (!cached) return null;

    const parsed = JSON.parse(cached);
    return parsed.data as T;
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidateCache(pattern: string): Promise<number> {
    const keys = await this.client.keys(pattern);

    if (keys.length === 0) return 0;

    await this.client.del(...keys);

    // Log invalidation event
    await this.client.xadd('invalidation:log', '*', {
      pattern,
      count: keys.length,
      timestamp: Date.now()
    });

    return keys.length;
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateCacheByTags(tags: string[]): Promise<number> {
    let totalInvalidated = 0;

    for (const tag of tags) {
      const keys = await this.client.smembers(`cache:tag:${tag}`);

      if (keys.length > 0) {
        await this.client.del(...keys);
        await this.client.del(`cache:tag:${tag}`);
        totalInvalidated += keys.length;
      }
    }

    return totalInvalidated;
  }

  // ========== TELEMETRY BUFFERING ==========

  /**
   * Buffer telemetry data
   */
  async bufferTelemetry(robotId: string, data: TelemetryData): Promise<void> {
    const key = `telemetry:buffer:${robotId}`;
    const maxLength = redisConfig.dataStructures.telemetryBuffer.maxLength;

    // Add to list
    await this.client.lpush(key, JSON.stringify(data));

    // Trim to max length
    await this.client.ltrim(key, 0, maxLength - 1);

    // Set TTL
    await this.client.expire(key, redisConfig.dataStructures.telemetryBuffer.ttl);

    // Also add to stream for real-time subscribers
    await this.client.xadd(
      `telemetry:stream:${robotId}`,
      '*',
      { data: JSON.stringify(data) },
      { MAXLEN: ['~', '10000'] }
    );
  }

  /**
   * Get buffered telemetry
   */
  async getBufferedTelemetry(robotId: string, count: number = 100): Promise<TelemetryData[]> {
    const key = `telemetry:buffer:${robotId}`;
    const items = await this.getReadClient().lrange(key, 0, count - 1);

    return items.map(item => JSON.parse(item));
  }

  /**
   * Flush telemetry buffer (after writing to DB)
   */
  async flushTelemetryBuffer(robotId: string): Promise<void> {
    const key = `telemetry:buffer:${robotId}`;
    await this.client.del(key);
  }

  // ========== RATE LIMITING ==========

  /**
   * Get or create rate limiter
   */
  private getRateLimiter(type: keyof typeof redisConfig.dataStructures.rateLimits.limits): Ratelimit {
    if (this.rateLimiters.has(type)) {
      return this.rateLimiters.get(type)!;
    }

    const config = redisConfig.dataStructures.rateLimits.limits[type];
    const limiter = new Ratelimit({
      redis: this.client,
      limiter: Ratelimit.slidingWindow(config.requests, `${config.window}s`),
      analytics: true,
      prefix: `ratelimit:${type}:`
    });

    this.rateLimiters.set(type, limiter);
    return limiter;
  }

  /**
   * Check rate limit
   */
  async checkRateLimit(
    type: 'api' | 'auth' | 'telemetry',
    identifier: string
  ): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
    const limiter = this.getRateLimiter(type);
    const result = await limiter.limit(identifier);

    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset
    };
  }

  // ========== WEBSOCKET MANAGEMENT ==========

  /**
   * Register WebSocket connection
   */
  async registerWebSocket(connectionId: string, userId: string, subscriptions: string[]): Promise<void> {
    const key = `ws:connection:${connectionId}`;
    const ttl = redisConfig.dataStructures.websocketConnections.ttl;

    await this.client.setex(key, ttl, JSON.stringify({
      userId,
      connectedAt: Date.now(),
      subscriptions,
      lastPing: Date.now()
    }));

    // Add to user's connections set
    await this.client.sadd(`ws:user:${userId}`, connectionId);
  }

  /**
   * Subscribe to room
   */
  async subscribeToRoom(roomId: string, connectionId: string): Promise<void> {
    const key = `ws:room:${roomId}`;
    await this.client.sadd(key, connectionId);
    await this.client.expire(key, redisConfig.dataStructures.websocketRooms.ttl);
  }

  /**
   * Unsubscribe from room
   */
  async unsubscribeFromRoom(roomId: string, connectionId: string): Promise<void> {
    const key = `ws:room:${roomId}`;
    await this.client.srem(key, connectionId);
  }

  /**
   * Get room members
   */
  async getRoomMembers(roomId: string): Promise<string[]> {
    const key = `ws:room:${roomId}`;
    return this.getReadClient().smembers(key);
  }

  /**
   * Remove WebSocket connection
   */
  async removeWebSocket(connectionId: string): Promise<void> {
    const key = `ws:connection:${connectionId}`;
    const conn = await this.getReadClient().get<string>(key);

    if (conn) {
      const parsed = JSON.parse(conn);
      await this.client.srem(`ws:user:${parsed.userId}`, connectionId);
    }

    await this.client.del(key);
  }

  // ========== NOTIFICATIONS ==========

  /**
   * Queue notification for user
   */
  async queueNotification(userId: string, notification: any): Promise<void> {
    const key = `notification:${userId}`;
    const maxLength = redisConfig.dataStructures.notifications.maxLength;

    await this.client.lpush(key, JSON.stringify({
      ...notification,
      timestamp: Date.now()
    }));

    await this.client.ltrim(key, 0, maxLength - 1);
    await this.client.expire(key, redisConfig.dataStructures.notifications.ttl);
  }

  /**
   * Get user notifications
   */
  async getNotifications(userId: string, count: number = 20): Promise<any[]> {
    const key = `notification:${userId}`;
    const items = await this.getReadClient().lrange(key, 0, count - 1);

    return items.map(item => JSON.parse(item));
  }

  /**
   * Clear notifications
   */
  async clearNotifications(userId: string): Promise<void> {
    const key = `notification:${userId}`;
    await this.client.del(key);
  }

  // ========== ROBOT STATUS ==========

  /**
   * Update robot status
   */
  async updateRobotStatus(robotId: string, status: any): Promise<void> {
    const key = `robot:status:${robotId}`;
    const ttl = redisConfig.dataStructures.robotStatus.ttl;

    await this.client.setex(key, ttl, JSON.stringify({
      ...status,
      lastUpdated: Date.now()
    }));
  }

  /**
   * Get robot status
   */
  async getRobotStatus(robotId: string): Promise<any | null> {
    const key = `robot:status:${robotId}`;
    const status = await this.getReadClient().get<string>(key);

    return status ? JSON.parse(status) : null;
  }

  // ========== TASK QUEUE ==========

  /**
   * Add task to priority queue
   */
  async enqueueTask(taskId: string, priority: number): Promise<void> {
    const key = 'queue:tasks:priority';
    await this.client.zadd(key, { score: priority, member: taskId });
  }

  /**
   * Get next task from queue
   */
  async dequeueTask(): Promise<string | null> {
    const key = 'queue:tasks:priority';
    const tasks = await this.client.zpopmax(key, 1);

    return tasks.length > 0 ? tasks[0].member : null;
  }

  /**
   * Get queue length
   */
  async getQueueLength(): Promise<number> {
    const key = 'queue:tasks:priority';
    return this.getReadClient().zcard(key);
  }

  // ========== MONITORING ==========

  /**
   * Get Redis info
   */
  async getInfo(): Promise<any> {
    try {
      const info = await this.client.info();
      return this.parseRedisInfo(info);
    } catch (error) {
      console.error('Failed to get Redis info:', error);
      return null;
    }
  }

  /**
   * Parse Redis INFO output
   */
  private parseRedisInfo(info: string): Record<string, any> {
    const lines = info.split('\n');
    const result: Record<string, any> = {};
    let section = 'general';

    for (const line of lines) {
      if (line.startsWith('#')) {
        section = line.slice(1).trim().toLowerCase();
        result[section] = {};
      } else if (line.includes(':')) {
        const [key, value] = line.split(':');
        result[section][key.trim()] = value.trim();
      }
    }

    return result;
  }

  /**
   * Get memory usage
   */
  async getMemoryUsage(): Promise<{ used: number; peak: number; percentage: number }> {
    const info = await this.getInfo();

    if (!info || !info.memory) {
      return { used: 0, peak: 0, percentage: 0 };
    }

    return {
      used: parseInt(info.memory.used_memory || '0'),
      peak: parseInt(info.memory.used_memory_peak || '0'),
      percentage: parseFloat(info.memory.used_memory_percentage || '0')
    };
  }

  /**
   * Get connection count
   */
  async getConnectionCount(): Promise<number> {
    const info = await this.getInfo();
    return parseInt(info?.clients?.connected_clients || '0');
  }

  // ========== UTILITIES ==========

  /**
   * Execute pipeline
   */
  async pipeline(commands: Array<[string, ...any[]]>): Promise<any[]> {
    const pipeline = this.client.pipeline();

    for (const [command, ...args] of commands) {
      (pipeline as any)[command](...args);
    }

    return pipeline.exec();
  }

  /**
   * Get keys by pattern
   */
  async getKeys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }

  /**
   * Graceful shutdown
   */
  async disconnect(): Promise<void> {
    this.isConnected = false;
    // Upstash Redis REST API doesn't require explicit disconnection
    console.log('Redis client disconnected');
  }
}

// Export singleton instance
export const redis = new RedisClient();

// Export convenience functions
export const {
  setSession,
  getSession,
  touchSession,
  deleteSession,
  setToken,
  verifyToken,
  revokeToken,
  cacheApiResponse,
  getCachedApiResponse,
  invalidateCache,
  invalidateCacheByTags,
  bufferTelemetry,
  getBufferedTelemetry,
  flushTelemetryBuffer,
  checkRateLimit,
  registerWebSocket,
  subscribeToRoom,
  unsubscribeFromRoom,
  getRoomMembers,
  removeWebSocket,
  queueNotification,
  getNotifications,
  clearNotifications,
  updateRobotStatus,
  getRobotStatus,
  enqueueTask,
  dequeueTask,
  getQueueLength,
  ping,
  getClient,
  getReadClient
} = redis;

export default redis;
