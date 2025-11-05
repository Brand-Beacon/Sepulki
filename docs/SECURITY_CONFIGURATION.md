# Security Configuration Guide

This document outlines the security configurations implemented across all services in the Sepulki project.

## Table of Contents

1. [Overview](#overview)
2. [Hammer Orchestrator (GraphQL API)](#hammer-orchestrator-graphql-api)
3. [Local Auth Service](#local-auth-service)
4. [Forge UI (Next.js)](#forge-ui-nextjs)
5. [Environment Variables](#environment-variables)
6. [Production Deployment](#production-deployment)
7. [Testing Security](#testing-security)

## Overview

The security implementation includes:

- **Helmet** security headers (CSP, HSTS, XSS protection)
- **Rate limiting** (IP-based and user-based)
- **Request throttling** (progressive delays)
- **Input sanitization** (XSS, SQL injection prevention)
- **CSRF protection** (for authentication service)
- **Brute force protection** (for login endpoints)
- **Request validation** (suspicious pattern detection)
- **Security logging** (for monitoring and alerting)

## Hammer Orchestrator (GraphQL API)

### Security Features

#### 1. Helmet Security Headers
- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection
- Referrer Policy

#### 2. Rate Limiting

**Standard Rate Limiter** (General API)
- Window: 15 minutes
- Limit: 100 requests per IP/user
- Development: 1000 requests

**Query Rate Limiter** (GraphQL Queries)
- Window: 15 minutes
- Limit: 200 requests per IP/user
- Development: 10000 requests

**Mutation Rate Limiter** (GraphQL Mutations)
- Window: 15 minutes
- Limit: 50 requests per IP/user
- Development: 1000 requests

**Complexity Rate Limiter** (Query Complexity)
- Window: 15 minutes
- Limit: 10000 complexity points
- Development: 100000 complexity points

#### 3. Request Throttling
- Starts after 50 requests in 15 minutes
- Progressive delay: 100ms per request after threshold
- Maximum delay: 5 seconds

#### 4. Input Sanitization
- Removes null bytes and dangerous characters
- Validates all request bodies
- Prevents XSS, SQL injection, path traversal

### Configuration

```typescript
// services/hammer-orchestrator/src/middleware/security.ts
// services/hammer-orchestrator/src/middleware/rate-limit.ts
```

### Environment Variables

```bash
# Hammer Orchestrator Security
NODE_ENV=production                    # production | development
ALLOWED_ORIGINS=https://example.com    # Comma-separated list
REDIS_URL=redis://localhost:6379       # For distributed rate limiting
MAX_REQUEST_SIZE=100kb                 # Maximum request body size
REQUEST_TIMEOUT=30000                  # Request timeout in milliseconds
```

## Local Auth Service

### Security Features

#### 1. Strict Rate Limiting

**Login Rate Limiter** (Brute Force Protection)
- Window: 15 minutes
- Limit: 5 attempts per IP/username
- Development: 1000 attempts
- Only counts failed attempts

**Registration Rate Limiter**
- Window: 1 hour
- Limit: 3 registrations per IP
- Development: 1000 registrations

**Password Reset Rate Limiter**
- Window: 1 hour
- Limit: 3 reset attempts per IP/email
- Development: 1000 attempts

**General API Rate Limiter**
- Window: 15 minutes
- Limit: 100 requests per IP
- Development: 1000 requests

#### 2. CSRF Protection
- Double-submit cookie pattern
- Secure, HttpOnly cookies
- SameSite: Strict

#### 3. Input Validation
- Email format validation
- Username format validation (3-30 chars, alphanumeric)
- Password validation
- Removes dangerous characters

#### 4. Suspicious Activity Detection
- SQL injection pattern detection
- XSS pattern detection
- Command injection detection
- Path traversal detection
- Automatic blocking in production

### Configuration

```typescript
// services/local-auth/src/middleware/security.ts
```

### Environment Variables

```bash
# Local Auth Security
NODE_ENV=production                    # production | development
CSRF_SECRET=your-csrf-secret-here      # CSRF token secret (change in production!)
JWT_SECRET=your-jwt-secret-here        # JWT signing secret
DATABASE_URL=postgresql://...          # Database connection
REDIS_URL=redis://localhost:6379       # Session storage
```

## Forge UI (Next.js)

### Security Features

#### 1. Security Headers (Next.js Config)
- Strict-Transport-Security (HSTS)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection
- Content-Security-Policy (CSP)
- Permissions-Policy

#### 2. Rate Limiting (Middleware)

**API Routes**
- Window: 15 minutes
- Limit: 100 requests per IP
- Development: 1000 requests

**Auth Routes**
- Window: 15 minutes
- Limit: 20 requests per IP
- Development: 1000 requests

#### 3. Request Validation
- XSS pattern detection
- SQL injection detection
- Path traversal detection
- Content-Type validation

#### 4. Security Logging
- Request monitoring
- Blocked request logging
- Real-time security alerts

### Configuration

```typescript
// apps/forge-ui/next.config.js
// apps/forge-ui/src/middleware.ts
```

### Environment Variables

```bash
# Forge UI Security
NODE_ENV=production                    # production | development
NEXT_PUBLIC_GRAPHQL_URL=http://...     # GraphQL API endpoint
```

## Environment Variables

### Production Environment Variables (Required)

```bash
# Global
NODE_ENV=production

# Hammer Orchestrator
ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
REDIS_URL=redis://your-redis-host:6379
MAX_REQUEST_SIZE=100kb
REQUEST_TIMEOUT=30000

# Local Auth
CSRF_SECRET=generate-a-secure-random-string-here
JWT_SECRET=generate-another-secure-random-string-here
DATABASE_URL=postgresql://user:password@host:5432/database
REDIS_URL=redis://your-redis-host:6379

# Forge UI
NEXT_PUBLIC_GRAPHQL_URL=https://api.your-domain.com/graphql
```

### Generating Secure Secrets

```bash
# Generate CSRF_SECRET
openssl rand -base64 32

# Generate JWT_SECRET
openssl rand -base64 32
```

## Production Deployment

### Pre-Deployment Checklist

- [ ] Set `NODE_ENV=production` for all services
- [ ] Configure `ALLOWED_ORIGINS` with your production domains
- [ ] Generate and set secure `CSRF_SECRET` and `JWT_SECRET`
- [ ] Configure Redis for distributed rate limiting
- [ ] Enable HTTPS/TLS for all services
- [ ] Configure proper CORS origins
- [ ] Set up security monitoring and logging
- [ ] Test rate limiting and security headers
- [ ] Configure CDN with security headers
- [ ] Enable database SSL connections
- [ ] Set up firewall rules
- [ ] Configure API gateway (if applicable)

### Security Best Practices

1. **Never commit secrets to version control**
   - Use environment variables
   - Use secrets management (AWS Secrets Manager, HashiCorp Vault, etc.)

2. **Use HTTPS everywhere**
   - Enable HSTS with preload
   - Use TLS 1.3
   - Configure proper SSL certificates

3. **Enable Redis for rate limiting**
   - In-memory store is only for development
   - Use Redis/Memcached in production
   - Configure Redis with authentication

4. **Monitor security logs**
   - Set up alerts for suspicious activity
   - Monitor rate limit violations
   - Track failed authentication attempts
   - Use centralized logging (ELK, Datadog, etc.)

5. **Regular security updates**
   - Keep dependencies updated
   - Run `npm audit` regularly
   - Subscribe to security advisories

6. **Additional security layers**
   - Use API Gateway (AWS API Gateway, Kong, etc.)
   - Enable WAF (Web Application Firewall)
   - Configure DDoS protection (Cloudflare, AWS Shield)
   - Use CDN for static assets

## Testing Security

### 1. Test Rate Limiting

```bash
# Test hammer-orchestrator rate limit
for i in {1..110}; do
  curl -X POST http://localhost:4000/graphql \
    -H "Content-Type: application/json" \
    -d '{"query":"{ __typename }"}' \
    -w "\nStatus: %{http_code}\n"
done

# Test local-auth login rate limit
for i in {1..10}; do
  curl -X POST http://localhost:4446/auth/signin \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}' \
    -w "\nStatus: %{http_code}\n"
done
```

### 2. Test Security Headers

```bash
# Test hammer-orchestrator headers
curl -I http://localhost:4000/graphql

# Test forge-ui headers
curl -I http://localhost:3000

# Expected headers:
# - X-Content-Type-Options: nosniff
# - X-Frame-Options: DENY
# - X-XSS-Protection: 1; mode=block
# - Content-Security-Policy: ...
# - Strict-Transport-Security: ... (production only)
```

### 3. Test Input Validation

```bash
# Test XSS protection
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"<script>alert(1)</script>"}'

# Test SQL injection protection
curl -X POST http://localhost:4446/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com OR 1=1--","password":"test"}'
```

### 4. Security Scanning Tools

```bash
# Run npm audit
npm audit

# Run security linting
npm run lint

# Use OWASP ZAP or Burp Suite for penetration testing
```

### 5. Load Testing

```bash
# Install Apache Bench
sudo apt-get install apache2-utils

# Test rate limiting under load
ab -n 1000 -c 10 -H "Content-Type: application/json" \
  -p query.json http://localhost:4000/graphql
```

## Monitoring and Alerts

### Security Metrics to Monitor

1. **Rate Limit Violations**
   - Track IPs with excessive requests
   - Alert on repeated violations

2. **Failed Authentication Attempts**
   - Track failed login attempts
   - Alert on brute force patterns

3. **Suspicious Requests**
   - Track blocked requests
   - Alert on XSS/SQL injection attempts

4. **Response Times**
   - Monitor for DDoS attacks
   - Track abnormal traffic patterns

### Logging Configuration

```typescript
// Example: Structured logging
console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  level: 'warn',
  service: 'hammer-orchestrator',
  event: 'rate_limit_exceeded',
  ip: '192.168.1.1',
  path: '/graphql',
  metadata: { ... }
}));
```

## Incident Response

### If Security Breach Detected

1. **Immediate Actions**
   - Rotate all secrets (JWT_SECRET, CSRF_SECRET, etc.)
   - Block suspicious IPs at firewall level
   - Invalidate all active sessions
   - Enable maintenance mode if necessary

2. **Investigation**
   - Review security logs
   - Identify attack vector
   - Assess data exposure
   - Document timeline

3. **Remediation**
   - Patch vulnerabilities
   - Update security configurations
   - Restore from clean backups if needed
   - Notify affected users (if applicable)

4. **Prevention**
   - Implement additional security measures
   - Update monitoring and alerts
   - Conduct security review
   - Update incident response plan

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Helmet.js Documentation](https://helmetjs.github.io/)
- [Express Rate Limit](https://github.com/express-rate-limit/express-rate-limit)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)
- [GraphQL Security Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/GraphQL_Cheat_Sheet.html)

## Support

For security issues or questions:
- Open an issue (for non-sensitive issues)
- Contact security team directly (for sensitive issues)
- Review security audit reports

---

**Last Updated:** 2025-11-04

**Security Version:** 1.0.0
