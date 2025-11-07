"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.applySecurityMiddleware = exports.additionalSecurityHeaders = exports.detectSuspiciousActivity = exports.sanitizeAuthInput = exports.csrfTokenEndpoint = exports.doubleCsrfProtection = exports.speedLimiter = exports.generalRateLimiter = exports.passwordResetRateLimiter = exports.registrationRateLimiter = exports.loginRateLimiter = exports.helmetMiddleware = void 0;
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const express_slow_down_1 = __importDefault(require("express-slow-down"));
const csrf_csrf_1 = require("csrf-csrf");
/**
 * Environment configuration
 */
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';
/**
 * Helmet security headers middleware
 * Stricter configuration for auth service
 */
exports.helmetMiddleware = (0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:'],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'none'"],
            frameSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            frameAncestors: ["'none'"],
            ...(isProduction && { upgradeInsecureRequests: [] }),
        },
    },
    crossOriginEmbedderPolicy: isProduction,
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-origin' },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: isProduction
        ? {
            maxAge: 31536000, // 1 year
            includeSubDomains: true,
            preload: true,
        }
        : false,
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    referrerPolicy: { policy: 'no-referrer' },
});
/**
 * Strict login rate limiter
 * Prevents brute force attacks on login endpoint
 * 5 attempts per 15 minutes per IP
 */
exports.loginRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isDevelopment ? 1000 : 5, // Very strict: 5 attempts per window
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful logins
    skipFailedRequests: false, // Count failed attempts
    keyGenerator: (req) => {
        // Use combination of IP and attempted username for better tracking
        const ip = req.headers['x-forwarded-for'] || req.ip || 'unknown';
        const username = req.body?.username || req.body?.email || '';
        return `login:${ip}:${username}`;
    },
    handler: (req, res) => {
        const retryAfter = 15 * 60; // 15 minutes in seconds
        console.error('[Security] Login rate limit exceeded', {
            ip: req.ip,
            username: req.body?.username || req.body?.email,
            timestamp: new Date().toISOString(),
        });
        res.status(429).json({
            error: 'Too Many Attempts',
            message: 'Too many login attempts. Please try again later.',
            retryAfter,
        });
    },
});
/**
 * Registration rate limiter
 * Prevents spam registrations
 * 3 attempts per hour per IP
 */
exports.registrationRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: isDevelopment ? 1000 : 3,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        const ip = req.headers['x-forwarded-for'] || req.ip || 'unknown';
        return `register:${ip}`;
    },
    handler: (req, res) => {
        console.error('[Security] Registration rate limit exceeded', {
            ip: req.ip,
            timestamp: new Date().toISOString(),
        });
        res.status(429).json({
            error: 'Too Many Attempts',
            message: 'Too many registration attempts. Please try again later.',
            retryAfter: 3600, // 1 hour
        });
    },
});
/**
 * Password reset rate limiter
 * Prevents abuse of password reset functionality
 * 3 attempts per hour per IP
 */
exports.passwordResetRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: isDevelopment ? 1000 : 3,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        const ip = req.headers['x-forwarded-for'] || req.ip || 'unknown';
        const email = req.body?.email || '';
        return `reset:${ip}:${email}`;
    },
    handler: (req, res) => {
        console.error('[Security] Password reset rate limit exceeded', {
            ip: req.ip,
            email: req.body?.email,
            timestamp: new Date().toISOString(),
        });
        res.status(429).json({
            error: 'Too Many Attempts',
            message: 'Too many password reset attempts. Please try again later.',
            retryAfter: 3600,
        });
    },
});
/**
 * General API rate limiter
 * Applies to all other endpoints
 */
exports.generalRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isDevelopment ? 1000 : 100,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return req.headers['x-forwarded-for'] || req.ip || 'unknown';
    },
});
/**
 * Slow down middleware for progressive delays
 * Starts slowing down requests before hitting hard limit
 */
exports.speedLimiter = (0, express_slow_down_1.default)({
    windowMs: 15 * 60 * 1000,
    delayAfter: isDevelopment ? 1000 : 30,
    delayMs: (hits) => hits * 200, // Progressive delay
    maxDelayMs: 10000, // Maximum 10 second delay
    keyGenerator: (req) => {
        return req.headers['x-forwarded-for'] || req.ip || 'unknown';
    },
});
/**
 * CSRF protection middleware
 * Protects against Cross-Site Request Forgery attacks
 */
const csrfSecret = process.env.CSRF_SECRET || 'super-secret-csrf-key-change-in-production';
const csrfConfig = (0, csrf_csrf_1.doubleCsrf)({
    getSecret: () => csrfSecret,
    cookieName: '__Host-psifi.x-csrf-token',
    cookieOptions: {
        sameSite: 'strict',
        path: '/',
        secure: isProduction,
        httpOnly: true,
    },
    size: 64,
    ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
    getCsrfTokenFromRequest: (req) => {
        return req.headers['x-csrf-token'];
    },
    getSessionIdentifier: (req) => {
        // Use IP address as session identifier for stateless CSRF protection
        return (req.headers['x-forwarded-for'] || req.ip || 'unknown');
    },
});
exports.doubleCsrfProtection = csrfConfig.doubleCsrfProtection;
/**
 * CSRF token endpoint
 */
const csrfTokenEndpoint = (req, res) => {
    const token = csrfConfig.generateCsrfToken(req, res);
    res.json({ csrfToken: token });
};
exports.csrfTokenEndpoint = csrfTokenEndpoint;
/**
 * Input sanitization for auth endpoints
 */
const sanitizeAuthInput = (req, res, next) => {
    if (req.body) {
        // Sanitize common auth fields
        ['username', 'email', 'password', 'token'].forEach((field) => {
            if (req.body[field] && typeof req.body[field] === 'string') {
                req.body[field] = req.body[field]
                    .trim()
                    .replace(/\0/g, '') // Remove null bytes
                    .replace(/\x00/g, ''); // Remove null characters
            }
        });
        // Additional validation for email
        if (req.body.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(req.body.email)) {
                res.status(400).json({
                    error: 'Bad Request',
                    message: 'Invalid email format',
                });
                return;
            }
        }
        // Validate username format
        if (req.body.username) {
            const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
            if (!usernameRegex.test(req.body.username)) {
                res.status(400).json({
                    error: 'Bad Request',
                    message: 'Username must be 3-30 characters and contain only letters, numbers, underscores, and hyphens',
                });
                return;
            }
        }
    }
    next();
};
exports.sanitizeAuthInput = sanitizeAuthInput;
/**
 * Suspicious activity detection
 */
const detectSuspiciousActivity = (req, res, next) => {
    const suspiciousIndicators = [
        // SQL injection patterns
        /(\bunion\b.*\bselect\b|\binsert\b.*\binto\b|\bdelete\b.*\bfrom\b)/i,
        // XSS patterns
        /<script|javascript:|onerror=|onload=/i,
        // Command injection
        /;.*cat\s|;.*ls\s|;\s*rm\s/i,
        // Path traversal
        /\.\.[\/\\]/,
    ];
    const requestData = JSON.stringify({
        body: req.body,
        query: req.query,
        params: req.params,
    });
    const isSuspicious = suspiciousIndicators.some((pattern) => pattern.test(requestData));
    if (isSuspicious) {
        console.error('[Security] SUSPICIOUS ACTIVITY DETECTED', {
            ip: req.ip,
            path: req.path,
            method: req.method,
            headers: req.headers,
            timestamp: new Date().toISOString(),
        });
        // In production, block the request immediately
        if (isProduction) {
            res.status(403).json({
                error: 'Forbidden',
                message: 'Request blocked due to security policy',
            });
            return;
        }
        // In development, log but allow
        console.warn('[Security] Request allowed in development mode');
    }
    next();
};
exports.detectSuspiciousActivity = detectSuspiciousActivity;
/**
 * Additional security headers
 */
const additionalSecurityHeaders = (req, res, next) => {
    // Prevent caching of sensitive data
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    // Additional security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.removeHeader('X-Powered-By');
    next();
};
exports.additionalSecurityHeaders = additionalSecurityHeaders;
/**
 * Apply all security middleware to app
 */
const applySecurityMiddleware = (app) => {
    app.use(exports.helmetMiddleware);
    app.use(exports.speedLimiter);
    app.use(exports.generalRateLimiter);
    app.use(exports.sanitizeAuthInput);
    app.use(exports.detectSuspiciousActivity);
    app.use(exports.additionalSecurityHeaders);
    console.log(`[Security] Auth middleware applied (${process.env.NODE_ENV || 'development'} mode)`);
};
exports.applySecurityMiddleware = applySecurityMiddleware;
//# sourceMappingURL=security.js.map