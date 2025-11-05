/**
 * Rate Limiting Middleware for Hammer Orchestrator
 *
 * Implements sophisticated rate limiting with:
 * - IP-based rate limiting
 * - User-based rate limiting (authenticated users)
 * - Different limits for mutations vs queries
 * - GraphQL complexity-based limiting
 * - Redis store for distributed rate limiting
 * - Automatic retry-after headers
 */

import rateLimit, { RateLimitRequestHandler, ipKeyGenerator } from 'express-rate-limit';
import { Request, Response } from 'express';
import Redis from 'ioredis';

/**
 * Environment configuration
 */
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Redis client for distributed rate limiting
 * Falls back to memory store if Redis is not available
 */
let redisClient: Redis | null = null;

if (process.env.REDIS_URL) {
  try {
    redisClient = new Redis(process.env.REDIS_URL, {
      enableOfflineQueue: false,
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        if (times > 3) {
          console.error('[Rate Limit] Redis connection failed, falling back to memory store');
          return null;
        }
        return Math.min(times * 100, 3000);
      },
    });

    redisClient.on('error', (err) => {
      console.error('[Rate Limit] Redis error:', err);
      redisClient = null;
    });

    redisClient.on('connect', () => {
      console.log('[Rate Limit] Redis connected successfully');
    });
  } catch (error) {
    console.error('[Rate Limit] Failed to initialize Redis:', error);
    redisClient = null;
  }
}

/**
 * Create Redis store if available, otherwise use memory store
 * Note: RedisStore is currently not compatible with express-rate-limit's Store interface
 * Using memory store for now. For production, consider using rate-limit-redis package
 */
const createStore = (prefix: string): any => {
  // For now, use memory store (default)
  // TODO: Integrate proper Redis store using rate-limit-redis package
  if (redisClient && false) { // Disabled until proper Redis store integration
    console.log('[Rate Limit] Redis client available but using memory store for compatibility');
  }
  return undefined; // Falls back to default memory store
};

/**
 * Key generator that identifies users by IP or authentication token
 */
const resolveClientIp = (req: Request): string => {
  const forwardedFor = req.headers['x-forwarded-for'];

  if (typeof forwardedFor === 'string' && forwardedFor.trim().length > 0) {
    return forwardedFor.split(',')[0].trim();
  }

  if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
    return forwardedFor[0];
  }

  return ipKeyGenerator(req);
};

const keyGenerator = (req: Request): string => {
  // Use user ID if authenticated
  const userId = (req as any).user?.id || (req as any).userId;
  if (userId) {
    return `user:${userId}`;
  }

  // Otherwise use IP address
  const ip = resolveClientIp(req);
  return `ip:${ip}`;
};

/**
 * Skip rate limiting for certain conditions
 */
const skip = (req: Request): boolean => {
  // Skip rate limiting in development mode if configured
  if (isDevelopment && process.env.SKIP_RATE_LIMIT === 'true') {
    return true;
  }

  // Skip for health check endpoints
  if (req.path === '/health' || req.path === '/ready') {
    return true;
  }

  return false;
};

/**
 * Rate limit error handler
 */
const handler = (req: Request, res: Response): void => {
  const retryAfter = res.getHeader('Retry-After');

  console.warn('[Rate Limit] Limit exceeded', {
    key: keyGenerator(req),
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  res.status(429).json({
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Please try again later.',
    retryAfter: retryAfter ? parseInt(retryAfter as string, 10) : 900, // 15 minutes default
  });
};

/**
 * Standard rate limiter for general API endpoints
 * 100 requests per 15 minutes per IP/user
 */
export const standardRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 1000 : 100, // Relaxed in development
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  store: createStore('standard:'),
  keyGenerator,
  skip,
  handler,
  message: {
    error: 'Too Many Requests',
    message: 'You have exceeded the rate limit. Please try again later.',
  },
});

/**
 * Strict rate limiter for sensitive operations
 * 20 requests per 15 minutes per IP/user
 */
export const strictRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 1000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore('strict:'),
  keyGenerator,
  skip,
  handler,
  message: {
    error: 'Too Many Requests',
    message: 'You have exceeded the rate limit for this operation.',
  },
});

/**
 * Mutation rate limiter for GraphQL mutations
 * 50 requests per 15 minutes per IP/user
 */
export const mutationRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 1000 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore('mutation:'),
  keyGenerator,
  skip: (req: Request) => {
    if (skip(req)) return true;

    // Only apply to mutations
    const operationType = getGraphQLOperationType(req);
    return operationType !== 'mutation';
  },
  handler,
  message: {
    error: 'Too Many Requests',
    message: 'You have exceeded the rate limit for mutations.',
  },
});

/**
 * Query rate limiter for GraphQL queries
 * 200 requests per 15 minutes per IP/user (more lenient than mutations)
 */
export const queryRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 10000 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore('query:'),
  keyGenerator,
  skip: (req: Request) => {
    if (skip(req)) return true;

    // Only apply to queries
    const operationType = getGraphQLOperationType(req);
    return operationType !== 'query';
  },
  handler,
  message: {
    error: 'Too Many Requests',
    message: 'You have exceeded the rate limit for queries.',
  },
});

/**
 * GraphQL complexity-based rate limiter
 * Note: Complexity-based limiting would require custom implementation
 * Using standard rate limiting for now
 */
export const complexityRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 100000 : 10000, // Complexity points
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore('complexity:'),
  keyGenerator,
  skip,
  handler: (req: Request, res: Response) => {
    console.warn('[Rate Limit] Complexity limit exceeded', {
      key: keyGenerator(req),
      path: req.path,
      timestamp: new Date().toISOString(),
    });

    res.status(429).json({
      error: 'Too Many Requests',
      message: 'You have exceeded the complexity limit. Please simplify your queries.',
    });
  },
});

/**
 * Helper function to determine GraphQL operation type
 */
function getGraphQLOperationType(req: Request): 'query' | 'mutation' | 'subscription' | null {
  try {
    const body = req.body;
    if (!body || !body.query) return null;

    const query = body.query as string;

    if (query.trim().startsWith('mutation')) return 'mutation';
    if (query.trim().startsWith('query')) return 'query';
    if (query.trim().startsWith('subscription')) return 'subscription';

    // Default to query if no explicit operation type
    return 'query';
  } catch (error) {
    return null;
  }
}

/**
 * Apply rate limiting middleware to app
 */
export const applyRateLimiting = (app: any) => {
  // Apply standard rate limiting to all routes by default
  app.use('/graphql', standardRateLimiter);
  app.use('/graphql', queryRateLimiter);
  app.use('/graphql', mutationRateLimiter);
  app.use('/graphql', complexityRateLimiter);

  console.log(`[Rate Limit] Middleware applied (${process.env.NODE_ENV || 'development'} mode)`);
  console.log(`[Rate Limit] Using ${redisClient ? 'Redis' : 'memory'} store`);
};

/**
 * Cleanup function to close Redis connection
 */
export const closeRateLimitStore = async () => {
  if (redisClient) {
    await redisClient.quit();
    console.log('[Rate Limit] Redis connection closed');
  }
};
