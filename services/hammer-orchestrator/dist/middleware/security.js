"use strict";
/**
 * Security Middleware for Hammer Orchestrator
 *
 * Implements production-grade security measures including:
 * - Helmet security headers with CSP
 * - CORS configuration
 * - Request throttling
 * - Input sanitization
 * - Environment-based security levels
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.applySecurityMiddleware = exports.securityLogger = exports.requestTimeout = exports.requestSizeLimit = exports.additionalSecurityHeaders = exports.sanitizeInput = exports.speedLimiter = exports.corsMiddleware = exports.helmetMiddleware = void 0;
const helmet_1 = __importDefault(require("helmet"));
const express_slow_down_1 = __importDefault(require("express-slow-down"));
/**
 * Environment configuration
 */
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';
/**
 * Allowed origins for CORS
 * In production, this should be restricted to known domains
 */
const allowedOrigins = isDevelopment
    ? ['http://localhost:3000', 'http://localhost:4000']
    : (process.env.ALLOWED_ORIGINS?.split(',') || []);
/**
 * Content Security Policy configuration
 * Strict in production, relaxed in development for easier debugging
 */
const contentSecurityPolicy = isProduction
    ? {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"], // Required for some UI frameworks
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            frameAncestors: ["'none'"],
            upgradeInsecureRequests: [],
        },
    }
    : {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            imgSrc: ["'self'", 'data:', 'https:', 'http:'],
            connectSrc: ["'self'", 'ws:', 'wss:'],
            fontSrc: ["'self'", 'data:'],
        },
    };
/**
 * Helmet security headers middleware
 * Configures various security-related HTTP headers
 */
exports.helmetMiddleware = (0, helmet_1.default)({
    contentSecurityPolicy,
    crossOriginEmbedderPolicy: isProduction,
    crossOriginOpenerPolicy: isProduction ? { policy: 'same-origin' } : false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
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
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true,
});
/**
 * CORS middleware configuration
 */
const corsMiddleware = (req, res, next) => {
    const origin = req.headers.origin;
    // Allow requests from allowed origins or if no origin (same-origin requests)
    if (!origin || allowedOrigins.includes(origin) || isDevelopment) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
        res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-CSRF-Token');
        res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    }
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }
    next();
};
exports.corsMiddleware = corsMiddleware;
/**
 * Request throttling middleware
 * Slows down requests after a threshold to prevent abuse
 */
exports.speedLimiter = (0, express_slow_down_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: isDevelopment ? 1000 : 50, // Allow 50 requests per windowMs before throttling
    delayMs: (hits) => hits * 100, // Add 100ms delay per request after threshold
    maxDelayMs: 5000, // Maximum delay of 5 seconds
    skipFailedRequests: false,
    skipSuccessfulRequests: false,
    keyGenerator: (req) => {
        // Use X-Forwarded-For header if behind a proxy, otherwise use IP
        return req.headers['x-forwarded-for'] || req.ip || 'unknown';
    },
    onLimitReached: (req) => {
        console.warn(`Speed limit reached for IP: ${req.ip || 'unknown'}`);
    },
});
/**
 * Input sanitization middleware
 * Removes potentially dangerous characters from request body
 */
const sanitizeInput = (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
        sanitizeObject(req.body);
    }
    next();
};
exports.sanitizeInput = sanitizeInput;
/**
 * Recursively sanitize object properties
 */
function sanitizeObject(obj) {
    for (const key in obj) {
        if (typeof obj[key] === 'string') {
            // Remove null bytes and other potentially dangerous characters
            obj[key] = obj[key]
                .replace(/\0/g, '')
                .replace(/\x00/g, '')
                .trim();
        }
        else if (typeof obj[key] === 'object' && obj[key] !== null) {
            sanitizeObject(obj[key]);
        }
    }
}
/**
 * Additional security headers middleware
 */
const additionalSecurityHeaders = (req, res, next) => {
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    // Enable XSS protection in older browsers
    res.setHeader('X-XSS-Protection', '1; mode=block');
    // Prevent information disclosure
    res.removeHeader('X-Powered-By');
    // Add cache control for sensitive endpoints
    if (req.path.includes('/graphql') || req.path.includes('/api')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
    next();
};
exports.additionalSecurityHeaders = additionalSecurityHeaders;
/**
 * Request size limiter
 * Prevents large payload attacks
 */
exports.requestSizeLimit = process.env.MAX_REQUEST_SIZE || '100kb';
/**
 * Timeout configuration
 * Prevents slow loris attacks
 */
exports.requestTimeout = parseInt(process.env.REQUEST_TIMEOUT || '30000', 10);
/**
 * Security logging middleware
 * Logs suspicious activity
 */
const securityLogger = (req, res, next) => {
    const suspiciousPatterns = [
        /(\.\.|\.\/)/i, // Path traversal
        /<script|javascript:/i, // XSS attempts
        /union.*select|insert.*into|drop.*table/i, // SQL injection
        /exec\s*\(|eval\s*\(/i, // Code injection
    ];
    const requestString = JSON.stringify({
        body: req.body,
        query: req.query,
        params: req.params,
    });
    const isSuspicious = suspiciousPatterns.some((pattern) => pattern.test(requestString));
    if (isSuspicious) {
        console.error('SECURITY WARNING: Suspicious request detected', {
            ip: req.ip,
            path: req.path,
            method: req.method,
            timestamp: new Date().toISOString(),
        });
        // In production, you might want to block the request
        if (isProduction) {
            res.status(403).json({
                error: 'Forbidden',
                message: 'Request blocked due to security policy',
            });
            return;
        }
    }
    next();
};
exports.securityLogger = securityLogger;
/**
 * Export all security middleware as a single function
 */
const applySecurityMiddleware = (app) => {
    app.use(exports.helmetMiddleware);
    app.use(exports.corsMiddleware);
    app.use(exports.speedLimiter);
    app.use(exports.sanitizeInput);
    app.use(exports.additionalSecurityHeaders);
    app.use(exports.securityLogger);
    console.log(`[Security] Middleware applied (${process.env.NODE_ENV || 'development'} mode)`);
};
exports.applySecurityMiddleware = applySecurityMiddleware;
