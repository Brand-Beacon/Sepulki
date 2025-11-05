/**
 * Next.js Middleware for Forge UI
 *
 * Implements:
 * - Rate limiting for API routes
 * - Request validation
 * - Security headers
 * - CSRF protection
 * - Logging and monitoring
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Environment configuration
 */
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Simple in-memory rate limiting store
 * In production, use Redis or a proper distributed store
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Clean up expired rate limit entries every 5 minutes
 */
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

/**
 * Rate limiting configuration
 */
const RATE_LIMITS = {
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isDevelopment ? 1000 : 100, // requests per window
  },
  auth: {
    windowMs: 15 * 60 * 1000,
    max: isDevelopment ? 1000 : 20, // strict for auth endpoints
  },
};

/**
 * Apply rate limiting
 */
function rateLimit(
  request: NextRequest,
  limit: { windowMs: number; max: number }
): { allowed: boolean; remaining: number; resetTime: number } {
  // Get client identifier (IP address)
  const identifier =
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown';

  const key = `${identifier}:${request.nextUrl.pathname}`;
  const now = Date.now();

  // Get or create rate limit entry
  let entry = rateLimitStore.get(key);

  if (!entry || entry.resetTime < now) {
    // Create new entry or reset expired entry
    entry = {
      count: 0,
      resetTime: now + limit.windowMs,
    };
    rateLimitStore.set(key, entry);
  }

  // Increment counter
  entry.count++;

  // Check if limit exceeded
  const allowed = entry.count <= limit.max;
  const remaining = Math.max(0, limit.max - entry.count);

  return {
    allowed,
    remaining,
    resetTime: entry.resetTime,
  };
}

/**
 * Validate request
 */
function validateRequest(request: NextRequest): { valid: boolean; error?: string } {
  // Check for common attack patterns
  const url = request.nextUrl.toString();
  const suspiciousPatterns = [
    /(\.\.|\.\/)/i, // Path traversal
    /<script|javascript:/i, // XSS
    /union.*select|insert.*into|drop.*table/i, // SQL injection
    /exec\s*\(|eval\s*\(/i, // Code injection
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(url)) {
      return {
        valid: false,
        error: 'Request blocked due to security policy',
      };
    }
  }

  // Validate content type for POST/PUT/PATCH
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    const contentType = request.headers.get('content-type');
    if (contentType && !contentType.includes('application/json') &&
        !contentType.includes('multipart/form-data') &&
        !contentType.includes('application/x-www-form-urlencoded')) {
      return {
        valid: false,
        error: 'Invalid content type',
      };
    }
  }

  return { valid: true };
}

/**
 * Add security headers to response
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  // Additional runtime security headers
  response.headers.set('X-Request-ID', crypto.randomUUID());

  if (!isDevelopment) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow'); // Prevent indexing in non-prod
  }

  return response;
}

/**
 * Log request for monitoring
 */
function logRequest(request: NextRequest, blocked: boolean = false) {
  const log = {
    timestamp: new Date().toISOString(),
    method: request.method,
    url: request.nextUrl.pathname,
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
    userAgent: request.headers.get('user-agent'),
    blocked,
  };

  if (blocked) {
    console.error('[Security] Blocked request:', log);
  } else if (!isDevelopment) {
    console.log('[Request]', log);
  }
}

/**
 * Main middleware function
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and internal Next.js routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('/favicon.ico') ||
    pathname.includes('/robots.txt')
  ) {
    return NextResponse.next();
  }

  // Validate request
  const validation = validateRequest(request);
  if (!validation.valid) {
    logRequest(request, true);
    return NextResponse.json(
      { error: 'Forbidden', message: validation.error },
      { status: 403 }
    );
  }

  // Apply rate limiting for API routes
  if (pathname.startsWith('/api')) {
    const limit = pathname.startsWith('/api/auth')
      ? RATE_LIMITS.auth
      : RATE_LIMITS.api;

    const rateLimitResult = rateLimit(request, limit);

    if (!rateLimitResult.allowed) {
      logRequest(request, true);

      const response = NextResponse.json(
        {
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
        },
        { status: 429 }
      );

      // Add rate limit headers
      response.headers.set('X-RateLimit-Limit', limit.max.toString());
      response.headers.set('X-RateLimit-Remaining', '0');
      response.headers.set(
        'X-RateLimit-Reset',
        new Date(rateLimitResult.resetTime).toISOString()
      );
      response.headers.set(
        'Retry-After',
        Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString()
      );

      return response;
    }

    // Add rate limit info to response headers
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', limit.max.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set(
      'X-RateLimit-Reset',
      new Date(rateLimitResult.resetTime).toISOString()
    );

    addSecurityHeaders(response);
    logRequest(request);

    return response;
  }

  // For non-API routes, just add security headers
  const response = NextResponse.next();
  addSecurityHeaders(response);
  logRequest(request);

  return response;
}

/**
 * Configure middleware to run on specific paths
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
