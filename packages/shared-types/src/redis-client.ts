/**
 * Shared Redis Client Wrapper
 * Provides a consistent interface for Redis operations across services
 */

import Redis, { RedisOptions } from 'ioredis';

export interface RedisConfig {
  url?: string;
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  maxRetriesPerRequest?: number;
  enableReadyCheck?: boolean;
  connectTimeout?: number;
  retryStrategy?: (times: number) => number | void;
}

export class RedisClient {
  private client: Redis;
  private connected: boolean = false;

  constructor(config: RedisConfig = {}) {
    const options: RedisOptions = {
      maxRetriesPerRequest: config.maxRetriesPerRequest || 3,
      enableReadyCheck: config.enableReadyCheck !== false,
      connectTimeout: config.connectTimeout || 10000,
      lazyConnect: true,
      retryStrategy: config.retryStrategy || ((times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }),
    };

    if (config.keyPrefix) {
      options.keyPrefix = config.keyPrefix;
    }

    if (config.url) {
      this.client = new Redis(config.url, options);
    } else {
      this.client = new Redis({
        host: config.host || 'localhost',
        port: config.port || 6379,
        password: config.password,
        db: config.db || 0,
        ...options,
      });
    }

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      console.log('✅ Redis connected');
      this.connected = true;
    });

    this.client.on('error', (err) => {
      console.error('❌ Redis error:', err);
      this.connected = false;
    });

    this.client.on('close', () => {
      console.log('🔌 Redis connection closed');
      this.connected = false;
    });

    this.client.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
    });
  }

  async connect(): Promise<void> {
    if (!this.connected) {
      await this.client.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.client.quit();
      this.connected = false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  getClient(): Redis {
    return this.client;
  }

  // Session operations
  async setSession(sessionId: string, data: any, ttl: number = 86400): Promise<void> {
    await this.client.setex(`session:${sessionId}`, ttl, JSON.stringify(data));
  }

  async getSession(sessionId: string): Promise<any | null> {
    const data = await this.client.get(`session:${sessionId}`);
    return data ? JSON.parse(data) : null;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.client.del(`session:${sessionId}`);
  }

  async extendSession(sessionId: string, ttl: number = 86400): Promise<void> {
    await this.client.expire(`session:${sessionId}`, ttl);
  }

  // Cache operations
  async setCache(key: string, value: any, ttl?: number): Promise<void> {
    const data = JSON.stringify(value);
    if (ttl) {
      await this.client.setex(`cache:${key}`, ttl, data);
    } else {
      await this.client.set(`cache:${key}`, data);
    }
  }

  async getCache(key: string): Promise<any | null> {
    const data = await this.client.get(`cache:${key}`);
    return data ? JSON.parse(data) : null;
  }

  async deleteCache(key: string): Promise<void> {
    await this.client.del(`cache:${key}`);
  }

  async invalidateCachePattern(pattern: string): Promise<void> {
    const keys = await this.client.keys(`cache:${pattern}`);
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }

  // Rate limiting operations
  async incrementRateLimit(key: string, ttl: number = 3600): Promise<number> {
    const current = await this.client.incr(`ratelimit:${key}`);
    if (current === 1) {
      await this.client.expire(`ratelimit:${key}`, ttl);
    }
    return current;
  }

  async getRateLimit(key: string): Promise<number> {
    const value = await this.client.get(`ratelimit:${key}`);
    return value ? parseInt(value, 10) : 0;
  }

  async resetRateLimit(key: string): Promise<void> {
    await this.client.del(`ratelimit:${key}`);
  }

  // Pub/Sub operations
  async publish(channel: string, message: any): Promise<void> {
    await this.client.publish(channel, JSON.stringify(message));
  }

  subscribe(channel: string, callback: (message: any) => void): void {
    const subscriber = this.client.duplicate();
    subscriber.subscribe(channel);
    subscriber.on('message', (ch, msg) => {
      if (ch === channel) {
        try {
          callback(JSON.parse(msg));
        } catch (err) {
          callback(msg);
        }
      }
    });
  }

  // Health check
  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }
}

// Singleton instance for easy import
let defaultClient: RedisClient | null = null;

export function getRedisClient(config?: RedisConfig): RedisClient {
  if (!defaultClient) {
    defaultClient = new RedisClient(config);
  }
  return defaultClient;
}

export async function closeRedisClient(): Promise<void> {
  if (defaultClient) {
    await defaultClient.disconnect();
    defaultClient = null;
  }
}
