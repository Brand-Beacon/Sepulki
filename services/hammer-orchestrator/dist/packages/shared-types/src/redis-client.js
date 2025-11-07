"use strict";
/**
 * Shared Redis Client Wrapper
 * Provides a consistent interface for Redis operations across services
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisClient = void 0;
exports.getRedisClient = getRedisClient;
exports.closeRedisClient = closeRedisClient;
const ioredis_1 = __importDefault(require("ioredis"));
class RedisClient {
    constructor(config = {}) {
        this.connected = false;
        const options = {
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
            this.client = new ioredis_1.default(config.url, options);
        }
        else {
            this.client = new ioredis_1.default({
                host: config.host || 'localhost',
                port: config.port || 6379,
                password: config.password,
                db: config.db || 0,
                ...options,
            });
        }
        this.setupEventHandlers();
    }
    setupEventHandlers() {
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
    async connect() {
        if (!this.connected) {
            await this.client.connect();
        }
    }
    async disconnect() {
        if (this.connected) {
            await this.client.quit();
            this.connected = false;
        }
    }
    isConnected() {
        return this.connected;
    }
    getClient() {
        return this.client;
    }
    // Session operations
    async setSession(sessionId, data, ttl = 86400) {
        await this.client.setex(`session:${sessionId}`, ttl, JSON.stringify(data));
    }
    async getSession(sessionId) {
        const data = await this.client.get(`session:${sessionId}`);
        return data ? JSON.parse(data) : null;
    }
    async deleteSession(sessionId) {
        await this.client.del(`session:${sessionId}`);
    }
    async extendSession(sessionId, ttl = 86400) {
        await this.client.expire(`session:${sessionId}`, ttl);
    }
    // Cache operations
    async setCache(key, value, ttl) {
        const data = JSON.stringify(value);
        if (ttl) {
            await this.client.setex(`cache:${key}`, ttl, data);
        }
        else {
            await this.client.set(`cache:${key}`, data);
        }
    }
    async getCache(key) {
        const data = await this.client.get(`cache:${key}`);
        return data ? JSON.parse(data) : null;
    }
    async deleteCache(key) {
        await this.client.del(`cache:${key}`);
    }
    async invalidateCachePattern(pattern) {
        const keys = await this.client.keys(`cache:${pattern}`);
        if (keys.length > 0) {
            await this.client.del(...keys);
        }
    }
    // Rate limiting operations
    async incrementRateLimit(key, ttl = 3600) {
        const current = await this.client.incr(`ratelimit:${key}`);
        if (current === 1) {
            await this.client.expire(`ratelimit:${key}`, ttl);
        }
        return current;
    }
    async getRateLimit(key) {
        const value = await this.client.get(`ratelimit:${key}`);
        return value ? parseInt(value, 10) : 0;
    }
    async resetRateLimit(key) {
        await this.client.del(`ratelimit:${key}`);
    }
    // Pub/Sub operations
    async publish(channel, message) {
        await this.client.publish(channel, JSON.stringify(message));
    }
    subscribe(channel, callback) {
        const subscriber = this.client.duplicate();
        subscriber.subscribe(channel);
        subscriber.on('message', (ch, msg) => {
            if (ch === channel) {
                try {
                    callback(JSON.parse(msg));
                }
                catch (err) {
                    callback(msg);
                }
            }
        });
    }
    // Health check
    async ping() {
        try {
            const result = await this.client.ping();
            return result === 'PONG';
        }
        catch {
            return false;
        }
    }
}
exports.RedisClient = RedisClient;
// Singleton instance for easy import
let defaultClient = null;
function getRedisClient(config) {
    if (!defaultClient) {
        defaultClient = new RedisClient(config);
    }
    return defaultClient;
}
async function closeRedisClient() {
    if (defaultClient) {
        await defaultClient.disconnect();
        defaultClient = null;
    }
}
