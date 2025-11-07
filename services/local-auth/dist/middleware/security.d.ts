/**
 * Security Middleware for Local Auth Service
 *
 * Implements strict security measures for authentication service:
 * - Strict rate limiting for login attempts (brute force protection)
 * - Helmet security headers
 * - CSRF protection
 * - Input validation and sanitization
 * - Suspicious activity detection
 */
import { Request, Response, NextFunction } from 'express';
/**
 * Helmet security headers middleware
 * Stricter configuration for auth service
 */
export declare const helmetMiddleware: (req: import("http").IncomingMessage, res: import("http").ServerResponse, next: (err?: unknown) => void) => void;
/**
 * Strict login rate limiter
 * Prevents brute force attacks on login endpoint
 * 5 attempts per 15 minutes per IP
 */
export declare const loginRateLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Registration rate limiter
 * Prevents spam registrations
 * 3 attempts per hour per IP
 */
export declare const registrationRateLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Password reset rate limiter
 * Prevents abuse of password reset functionality
 * 3 attempts per hour per IP
 */
export declare const passwordResetRateLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * General API rate limiter
 * Applies to all other endpoints
 */
export declare const generalRateLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Slow down middleware for progressive delays
 * Starts slowing down requests before hitting hard limit
 */
export declare const speedLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const doubleCsrfProtection: import("csrf-csrf").DoubleCsrfProtection;
/**
 * CSRF token endpoint
 */
export declare const csrfTokenEndpoint: (req: Request, res: Response) => void;
/**
 * Input sanitization for auth endpoints
 */
export declare const sanitizeAuthInput: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Suspicious activity detection
 */
export declare const detectSuspiciousActivity: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Additional security headers
 */
export declare const additionalSecurityHeaders: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Apply all security middleware to app
 */
export declare const applySecurityMiddleware: (app: any) => void;
//# sourceMappingURL=security.d.ts.map