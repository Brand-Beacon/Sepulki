# Security Quick Reference

## 🚀 Quick Start

### Install Dependencies

```bash
# Hammer Orchestrator
cd services/hammer-orchestrator
npm install

# Local Auth
cd services/local-auth
npm install

# Forge UI
cd apps/forge-ui
npm install
```

### Configure Environment

```bash
# Copy example environment file
cp docs/env.example .env

# Generate secrets
openssl rand -base64 32  # For JWT_SECRET
openssl rand -base64 32  # For CSRF_SECRET
```

### Start Services

```bash
# Terminal 1 - Hammer Orchestrator
cd services/hammer-orchestrator
npm run dev

# Terminal 2 - Local Auth
cd services/local-auth
npm run dev

# Terminal 3 - Forge UI
cd apps/forge-ui
npm run dev
```

---

## 🔒 Security Features

### Rate Limits

| Service | Endpoint | Limit | Window |
|---------|----------|-------|--------|
| Hammer Orchestrator | GraphQL (queries) | 200 req | 15 min |
| Hammer Orchestrator | GraphQL (mutations) | 50 req | 15 min |
| Hammer Orchestrator | General API | 100 req | 15 min |
| Local Auth | Login | 5 attempts | 15 min |
| Local Auth | Registration | 3 attempts | 1 hour |
| Local Auth | Password Reset | 3 attempts | 1 hour |
| Forge UI | API Routes | 100 req | 15 min |
| Forge UI | Auth Routes | 20 req | 15 min |

### Security Headers

✅ Content-Security-Policy
✅ Strict-Transport-Security (production)
✅ X-Frame-Options: DENY
✅ X-Content-Type-Options: nosniff
✅ X-XSS-Protection: 1; mode=block
✅ Referrer-Policy: strict-origin-when-cross-origin

---

## 🧪 Testing

### Test Rate Limiting

```bash
# Test hammer-orchestrator
for i in {1..110}; do curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}' -w "\nStatus: %{http_code}\n"; done

# Test local-auth login
for i in {1..10}; do curl -X POST http://localhost:4446/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrong"}' -w "\nStatus: %{http_code}\n"; done
```

### Test Security Headers

```bash
# Hammer Orchestrator
curl -I http://localhost:4000/graphql

# Local Auth
curl -I http://localhost:4446/health

# Forge UI
curl -I http://localhost:3000
```

### Test Input Validation

```bash
# Test XSS protection
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"<script>alert(1)</script>"}' -v

# Test SQL injection protection
curl -X POST http://localhost:4446/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com OR 1=1--","password":"test"}' -v
```

---

## 📊 Monitoring

### Check Service Health

```bash
# Hammer Orchestrator
curl http://localhost:4000/health

# Local Auth
curl http://localhost:4446/health

# Forge UI
curl http://localhost:3000/api/health  # If implemented
```

### View Security Logs

```bash
# Follow logs in development
tail -f services/hammer-orchestrator/logs/*.log
tail -f services/local-auth/logs/*.log

# In production, check centralized logging system
```

---

## ⚙️ Configuration

### Required Environment Variables

```bash
# Global
NODE_ENV=production

# Secrets (generate with: openssl rand -base64 32)
JWT_SECRET=your-secret-here
CSRF_SECRET=your-secret-here

# Origins
ALLOWED_ORIGINS=https://your-domain.com

# Redis
REDIS_URL=redis://localhost:6379

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db
```

### Development vs Production

| Setting | Development | Production |
|---------|-------------|------------|
| Rate Limits | Relaxed (1000) | Strict (5-200) |
| CSP | Relaxed | Strict |
| HSTS | Disabled | Enabled |
| Logging | Verbose | Structured |
| Origins | Localhost | Configured domains |

---

## 🔧 Troubleshooting

### Rate Limit Issues

```bash
# Check if rate limiting is active
curl -I http://localhost:4000/graphql

# Look for headers:
# X-RateLimit-Limit: 100
# X-RateLimit-Remaining: 99
# X-RateLimit-Reset: 2025-11-04T...
```

**Problem:** Rate limit hit in development
**Solution:** Set `SKIP_RATE_LIMIT=true` in .env (not recommended)

### CORS Issues

**Problem:** CORS errors in browser
**Solution:** Add your origin to `ALLOWED_ORIGINS` environment variable

```bash
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### Security Headers Not Applied

**Problem:** Security headers missing
**Solution:** Check middleware order in index.ts

```typescript
// Security middleware must be applied BEFORE routes
applySecurityMiddleware(app);
app.use('/graphql', ...);
```

### Redis Connection Issues

**Problem:** Redis connection failed
**Solution:** Falls back to memory store automatically. Configure Redis in production:

```bash
REDIS_URL=redis://user:password@host:6379
```

---

## 🚨 Emergency Response

### If Under Attack

1. **Immediate Actions:**
   ```bash
   # Block suspicious IPs at firewall level
   sudo ufw deny from <IP_ADDRESS>

   # Enable maintenance mode
   export MAINTENANCE_MODE=true

   # Rotate secrets
   export JWT_SECRET=$(openssl rand -base64 32)
   export CSRF_SECRET=$(openssl rand -base64 32)
   ```

2. **Investigation:**
   - Check security logs for patterns
   - Identify attack vector
   - Document timeline

3. **Recovery:**
   - Patch vulnerabilities
   - Restore from clean backups
   - Notify affected users

---

## 📚 Additional Resources

### Documentation
- [Full Security Configuration Guide](./SECURITY_CONFIGURATION.md)
- [Implementation Summary](./SECURITY_IMPLEMENTATION_SUMMARY.md)
- [Environment Variables Reference](./env.example)

### External Resources
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Helmet.js Documentation](https://helmetjs.github.io/)
- [Express Rate Limit](https://github.com/express-rate-limit/express-rate-limit)
- [GraphQL Security](https://cheatsheetseries.owasp.org/cheatsheets/GraphQL_Cheat_Sheet.html)

---

## 🔑 Security Checklist

### Development
- [ ] Environment variables configured
- [ ] Dependencies installed
- [ ] Services running
- [ ] Security headers visible
- [ ] Rate limiting tested

### Staging
- [ ] Production-like configuration
- [ ] Redis configured
- [ ] HTTPS enabled
- [ ] Load testing completed
- [ ] Security scan passed

### Production
- [ ] NODE_ENV=production
- [ ] Secrets rotated
- [ ] Redis configured
- [ ] Monitoring enabled
- [ ] Backups configured
- [ ] Incident response plan ready

---

## 💡 Pro Tips

1. **Use Redis in Production:**
   Memory store resets on restart. Redis provides distributed rate limiting.

2. **Monitor Security Logs:**
   Set up alerts for suspicious activity patterns.

3. **Regular Updates:**
   Run `npm audit` weekly and fix vulnerabilities promptly.

4. **Test in Staging:**
   Always test security changes in staging before production.

5. **Rotate Secrets:**
   Rotate JWT_SECRET and CSRF_SECRET quarterly.

6. **Rate Limit Tuning:**
   Monitor rate limit hits and adjust based on legitimate traffic patterns.

7. **CDN Integration:**
   Use CDN (Cloudflare) for additional DDoS protection.

---

## 📞 Support

**Security Issues:** Contact security team directly (do not create public issues)
**Configuration Help:** Check documentation in `/docs` directory
**Bug Reports:** Create issue with `security` label

---

**Last Updated:** 2025-11-04
