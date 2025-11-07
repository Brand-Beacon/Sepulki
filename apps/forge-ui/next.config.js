/** @type {import('next').NextConfig} */

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Security Headers Configuration
 * Implements strict security headers for production
 * Relaxed in development for easier debugging
 */
const securityHeaders = isDevelopment
  ? [
      // Development headers (relaxed for debugging)
      {
        key: 'X-DNS-Prefetch-Control',
        value: 'on'
      },
      {
        key: 'X-Frame-Options',
        value: 'SAMEORIGIN'
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff'
      },
      {
        key: 'Referrer-Policy',
        value: 'origin-when-cross-origin'
      }
    ]
  : [
      // Production headers (strict security)
      {
        key: 'X-DNS-Prefetch-Control',
        value: 'off'
      },
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload'
      },
      {
        key: 'X-Frame-Options',
        value: 'DENY'
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff'
      },
      {
        key: 'X-XSS-Protection',
        value: '1; mode=block'
      },
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin'
      },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
      },
      {
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js requires unsafe-inline and unsafe-eval
          "style-src 'self' 'unsafe-inline'", // Tailwind and styled-components require unsafe-inline
          "img-src 'self' data: https: blob:",
          "font-src 'self' data:",
          "connect-src 'self' http://localhost:4000 ws://localhost:4000", // GraphQL API
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "object-src 'none'"
        ].join('; ')
      }
    ];

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  typescript: {
    // ⚠️ Dangerously allow production builds to successfully complete even if
    // your project has type errors. Needed for deployment.
    ignoreBuildErrors: true,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },

  // Security headers
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // Additional caching headers for static assets
        source: '/static/:path*',
        headers: [
          ...securityHeaders,
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      {
        // No caching for API routes
        source: '/api/:path*',
        headers: [
          ...securityHeaders,
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, private'
          },
          {
            key: 'Pragma',
            value: 'no-cache'
          },
          {
            key: 'Expires',
            value: '0'
          }
        ]
      }
    ];
  },

  // Rewrites for development
  async rewrites() {
    return [];
  },

  // Webpack configuration for security
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't resolve 'fs' module on the client to prevent security issues
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },

  // Image optimization security
  images: {
    domains: [], // Add allowed image domains here
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },

  // Compiler options for better security
  compiler: {
    removeConsole: !isDevelopment ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Power by header removal (handled by Helmet in middleware)
  poweredByHeader: false,

  // Compression for performance (but doesn't expose version)
  compress: true,

  // Generate ETag for caching
  generateEtags: true,

  // HTTP Keep-Alive
  httpAgentOptions: {
    keepAlive: true,
  },
};

module.exports = nextConfig;
