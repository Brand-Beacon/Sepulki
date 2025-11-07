"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authResolvers = void 0;
const context_1 = require("../context");
const errors_1 = require("../errors");
const jose_1 = require("jose");
const crypto_1 = __importDefault(require("crypto"));
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production');
exports.authResolvers = {
    Mutation: {
        async login(parent, { credentials }, context) {
            const { email, password } = credentials;
            // Validate input
            if (!email || !password) {
                throw new errors_1.ValidationError('Email and password are required');
            }
            try {
                // Find smith by email
                const smithQuery = await context.db.query('SELECT * FROM smiths WHERE email = $1 AND is_active = true', [email.toLowerCase()]);
                if (smithQuery.rows.length === 0) {
                    throw new errors_1.AuthenticationError('Invalid credentials');
                }
                const smith = smithQuery.rows[0];
                // TODO: Implement proper password hashing and verification
                // For now, this is a placeholder - in production, use bcrypt or similar
                const passwordHash = crypto_1.default.createHash('sha256').update(password).digest('hex');
                if (smith.password_hash !== passwordHash) {
                    throw new errors_1.AuthenticationError('Invalid credentials');
                }
                // Create session
                const sessionId = crypto_1.default.randomUUID();
                const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
                const session = {
                    smithId: smith.id,
                    token: '', // Will be set below
                    refreshToken: crypto_1.default.randomUUID(),
                    expiresAt,
                    permissions: smith.permissions || [],
                    role: smith.role
                };
                // Create JWT token
                const token = await new jose_1.SignJWT({
                    sub: smith.id,
                    email: smith.email,
                    role: smith.role,
                    sessionId
                })
                    .setProtectedHeader({ alg: 'HS256' })
                    .setExpirationTime(expiresAt)
                    .setIssuedAt()
                    .sign(JWT_SECRET);
                session.token = token;
                // Store session in Redis
                const sessionKey = `session:${sessionId}`;
                await context.redis.setex(sessionKey, 24 * 60 * 60, JSON.stringify(session));
                // Update last login
                await context.db.query('UPDATE smiths SET last_login_at = NOW() WHERE id = $1', [smith.id]);
                return {
                    smith,
                    session
                };
            }
            catch (error) {
                if (error instanceof errors_1.AuthenticationError) {
                    throw error;
                }
                throw new errors_1.ServiceError('auth', `Login failed: ${error}`);
            }
        },
        async refreshToken(parent, { refreshToken }, context) {
            try {
                // Find session by refresh token
                const sessions = await context.redis.keys('session:*');
                let sessionData = null;
                let sessionKey = null;
                for (const key of sessions) {
                    const data = await context.redis.get(key);
                    if (data) {
                        const parsed = JSON.parse(data);
                        if (parsed.refreshToken === refreshToken) {
                            sessionData = parsed;
                            sessionKey = key;
                            break;
                        }
                    }
                }
                if (!sessionData || !sessionKey) {
                    throw new errors_1.AuthenticationError('Invalid refresh token');
                }
                // Check if session is expired
                if (new Date() > new Date(sessionData.expiresAt)) {
                    await context.redis.del(sessionKey);
                    throw new errors_1.AuthenticationError('Session expired');
                }
                // Get updated smith data
                const smithQuery = await context.db.query('SELECT * FROM smiths WHERE id = $1 AND is_active = true', [sessionData.smithId]);
                if (smithQuery.rows.length === 0) {
                    await context.redis.del(sessionKey);
                    throw new errors_1.AuthenticationError('Smith not found or inactive');
                }
                const smith = smithQuery.rows[0];
                // Create new session
                const newSessionId = crypto_1.default.randomUUID();
                const newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
                const newSession = {
                    smithId: smith.id,
                    token: '',
                    refreshToken: crypto_1.default.randomUUID(),
                    expiresAt: newExpiresAt,
                    permissions: smith.permissions || [],
                    role: smith.role
                };
                // Create new JWT token
                const newToken = await new jose_1.SignJWT({
                    sub: smith.id,
                    email: smith.email,
                    role: smith.role,
                    sessionId: newSessionId
                })
                    .setProtectedHeader({ alg: 'HS256' })
                    .setExpirationTime(newExpiresAt)
                    .setIssuedAt()
                    .sign(JWT_SECRET);
                newSession.token = newToken;
                // Store new session and remove old one
                const newSessionKey = `session:${newSessionId}`;
                await context.redis.setex(newSessionKey, 24 * 60 * 60, JSON.stringify(newSession));
                await context.redis.del(sessionKey);
                return {
                    smith,
                    session: newSession
                };
            }
            catch (error) {
                if (error instanceof errors_1.AuthenticationError) {
                    throw error;
                }
                throw new errors_1.ServiceError('auth', `Token refresh failed: ${error}`);
            }
        },
        async logout(parent, args, context) {
            const { session } = await (0, context_1.requireAuth)(context);
            try {
                // Remove session from Redis
                const sessionKey = `session:${session.smithId}`;
                await context.redis.del(sessionKey);
                return true;
            }
            catch (error) {
                throw new errors_1.ServiceError('auth', `Logout failed: ${error}`);
            }
        }
    },
    Smith: {
        async preferences(parent, args, context) {
            // Return default preferences if none set
            return parent.preferences || {
                theme: 'auto',
                language: 'en',
                timezone: 'UTC',
                notifications: {
                    email: true,
                    push: false
                },
                dashboard: {
                    defaultView: 'overview',
                    widgets: ['fleets', 'tasks', 'telemetry']
                }
            };
        }
    }
};
