"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createContext = createContext;
exports.requireAuth = requireAuth;
exports.requirePermission = requirePermission;
const pg_1 = require("pg");
const ioredis_1 = __importDefault(require("ioredis"));
const jose_1 = require("jose");
const shared_types_1 = require("@sepulki/shared-types");
const dataloaders_1 = require("./dataloaders");
// Database connection
const db = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://smith:forge_dev@localhost:5432/sepulki',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});
// Redis connection
const redis = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379');
// JWT secret
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production');
async function createContext({ token }) {
    const dataloaders = (0, dataloaders_1.setupDataLoaders)(db);
    if (!token) {
        return { db, redis, dataloaders };
    }
    console.log('🔧 NODE_ENV:', process.env.NODE_ENV);
    console.log('🔧 Token ends with mock signature:', token.endsWith('.mock-signature-for-development'));
    try {
        let payload;
        let smithId;
        let sessionId;
        // Check if this is a mock development token (only in local development)
        // Be more lenient: allow if NODE_ENV is undefined (common in dev), or if explicitly set to development
        const isProduction = process.env.NODE_ENV === 'production';
        const isLocalDev = !isProduction && (!process.env.NODE_ENV ||
            process.env.NODE_ENV === 'development' ||
            process.env.NODE_ENV === 'dev' ||
            process.env.DATABASE_URL?.includes('localhost') ||
            process.env.DATABASE_URL?.includes('127.0.0.1'));
        // If token has mock signature, treat it as mock (but only if not in production)
        if (!isProduction && token.endsWith('.mock-signature-for-development')) {
            // Parse mock JWT token (development only)
            const parts = token.split('.');
            if (parts.length === 3) {
                try {
                    payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
                    console.log('🔧 Using mock JWT token for development:', payload.email);
                }
                catch (e) {
                    throw new Error('Invalid mock token format');
                }
            }
            else {
                throw new Error('Invalid token format');
            }
        }
        else {
            // Use real JWT verification
            const result = await (0, jose_1.jwtVerify)(token, JWT_SECRET);
            payload = result.payload;
        }
        // Fetch smith and session from token claims
        smithId = payload.sub;
        sessionId = payload.sessionId;
        // For development mock tokens, try to load smith from database first, then fallback to mock
        if (isLocalDev && sessionId === 'mock-session-001') {
            // Try to load smith from database if we have a real user ID
            try {
                const smithQuery = await db.query('SELECT * FROM smiths WHERE id = $1 AND is_active = true', [smithId]);
                if (smithQuery.rows.length > 0) {
                    // Found smith in database - use real smith data
                    const dbSmith = smithQuery.rows[0];
                    // Get permissions from database or use defaults based on role
                    const permissions = dbSmith.permissions || [];
                    const mockSession = {
                        smithId: smithId,
                        token: 'mock-token-for-development',
                        refreshToken: 'mock-refresh-token',
                        expiresAt: new Date(payload.exp * 1000),
                        permissions: permissions,
                        role: dbSmith.role
                    };
                    console.log('✅ Using database smith for development:', dbSmith.email);
                    return {
                        db,
                        redis,
                        smith: dbSmith,
                        session: mockSession,
                        dataloaders
                    };
                }
            }
            catch (dbError) {
                console.warn('Could not load smith from database, using mock:', dbError);
            }
            // Fallback to mock smith data if database lookup fails
            const mockSmith = {
                id: smithId,
                name: payload.name || 'Development Smith',
                email: payload.email || 'dev@sepulki.com',
                role: payload.role || shared_types_1.SmithRole.OVER_SMITH,
                permissions: [
                    shared_types_1.Permission.VIEW_CATALOG,
                    shared_types_1.Permission.FORGE_SEPULKA,
                    shared_types_1.Permission.CAST_INGOT,
                    shared_types_1.Permission.TEMPER_INGOT,
                    shared_types_1.Permission.QUENCH_TO_FLEET,
                    shared_types_1.Permission.VIEW_FLEET, // Add VIEW_FLEET permission
                    shared_types_1.Permission.VIEW_ROBOTS,
                    shared_types_1.Permission.VIEW_TASKS
                ],
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
                preferences: {
                    theme: 'dark',
                    language: 'en',
                    timezone: 'UTC',
                    notifications: {
                        email: true,
                        push: true
                    },
                    dashboard: {
                        defaultView: 'overview',
                        widgets: []
                    }
                }
            };
            const mockSession = {
                smithId: smithId,
                token: 'mock-token-for-development',
                refreshToken: 'mock-refresh-token',
                expiresAt: new Date(payload.exp * 1000),
                permissions: mockSmith.permissions,
                role: payload.role || shared_types_1.SmithRole.OVER_SMITH
            };
            console.log('✅ Mock authentication successful for development:', mockSmith.email);
            return {
                db,
                redis,
                smith: mockSmith,
                session: mockSession,
                dataloaders
            };
        }
        // Production path: Load smith from database
        const smithQuery = await db.query('SELECT * FROM smiths WHERE id = $1 AND is_active = true', [smithId]);
        if (smithQuery.rows.length === 0) {
            throw new Error('Smith not found or inactive');
        }
        const smith = smithQuery.rows[0];
        // Load session from Redis
        const sessionKey = `session:${sessionId}`;
        const sessionData = await redis.get(sessionKey);
        if (!sessionData) {
            throw new Error('Session not found or expired');
        }
        const session = JSON.parse(sessionData);
        // Verify session hasn't expired
        if (new Date() > session.expiresAt) {
            await redis.del(sessionKey);
            throw new Error('Session expired');
        }
        return {
            db,
            redis,
            smith,
            session,
            dataloaders
        };
    }
    catch (error) {
        console.error('Auth context error:', error);
        throw new Error('Authentication failed');
    }
}
async function requireAuth(context) {
    if (!context.smith || !context.session) {
        throw new Error('Authentication required');
    }
    return { smith: context.smith, session: context.session };
}
async function requirePermission(context, permission) {
    const { smith, session } = await requireAuth(context);
    // Admin users have all permissions
    if (smith.role === shared_types_1.SmithRole.ADMIN) {
        return { smith, session };
    }
    if (!session.permissions.includes(permission)) {
        throw new Error(`Permission denied: ${permission} required`);
    }
    return { smith, session };
}
