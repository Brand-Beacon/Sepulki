// Unit tests for auth resolvers
// Tests login, refreshToken, logout, and Smith preferences

import { testEnv, createAuthenticatedContext, expectGraphQLSuccess, expectGraphQLError } from '../setup';
import { authResolvers } from '../../src/resolvers/auth';
import { AuthenticationError, ValidationError } from '../../src/errors';
import crypto from 'crypto';

describe('Auth Resolvers', () => {
  beforeEach(async () => {
    await testEnv.cleanDatabase();
    await testEnv.seedTestData();
  });

  describe('login', () => {
    const createMockContext = (overrides = {}) => ({
      db: testEnv.db,
      redis: testEnv.redis,
      dataloaders: testEnv.createAuthenticatedContext().then(ctx => ctx.dataloaders),
      ...overrides,
    });

    test('successfully logs in with valid credentials', async () => {
      // Create test smith
      const password = 'test123';
      const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
      
      const smithResult = await testEnv.db.query(`
        INSERT INTO smiths (id, email, name, password_hash, role, permissions, is_active)
        VALUES (
          gen_random_uuid(),
          'test@sepulki.com',
          'Test Smith',
          $1,
          'OVER_SMITH',
          ARRAY['FORGE_SEPULKA', 'VIEW_CATALOG'],
          true
        )
        RETURNING *
      `, [passwordHash]);

      const smith = smithResult.rows[0];
      const context = await createMockContext();

      const result = await authResolvers.Mutation.login(
        null,
        {
          credentials: {
            email: 'test@sepulki.com',
            password: 'test123',
          },
        },
        context as any
      );

      expect(result.smith).toBeDefined();
      expect(result.smith.email).toBe('test@sepulki.com');
      expect(result.session).toBeDefined();
      expect(result.session.token).toBeTruthy();
      expect(result.session.refreshToken).toBeTruthy();

      // Verify session stored in Redis
      const sessionKeys = await testEnv.redis.keys('session:*');
      expect(sessionKeys.length).toBeGreaterThan(0);
    });

    test('throws ValidationError for missing email', async () => {
      const context = await createMockContext();

      await expect(
        authResolvers.Mutation.login(
          null,
          {
            credentials: {
              email: '',
              password: 'test123',
            },
          },
          context as any
        )
      ).rejects.toThrow(ValidationError);
    });

    test('throws ValidationError for missing password', async () => {
      const context = await createMockContext();

      await expect(
        authResolvers.Mutation.login(
          null,
          {
            credentials: {
              email: 'test@sepulki.com',
              password: '',
            },
          },
          context as any
        )
      ).rejects.toThrow(ValidationError);
    });

    test('throws AuthenticationError for invalid email', async () => {
      const context = await createMockContext();

      await expect(
        authResolvers.Mutation.login(
          null,
          {
            credentials: {
              email: 'nonexistent@sepulki.com',
              password: 'test123',
            },
          },
          context as any
        )
      ).rejects.toThrow(AuthenticationError);
    });

    test('throws AuthenticationError for incorrect password', async () => {
      const password = 'test123';
      const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
      
      await testEnv.db.query(`
        INSERT INTO smiths (id, email, name, password_hash, role, permissions, is_active)
        VALUES (
          gen_random_uuid(),
          'test@sepulki.com',
          'Test Smith',
          $1,
          'OVER_SMITH',
          ARRAY['FORGE_SEPULKA'],
          true
        )
      `, [passwordHash]);

      const context = await createMockContext();

      await expect(
        authResolvers.Mutation.login(
          null,
          {
            credentials: {
              email: 'test@sepulki.com',
              password: 'wrongpassword',
            },
          },
          context as any
        )
      ).rejects.toThrow(AuthenticationError);
    });

    test('normalizes email to lowercase', async () => {
      const password = 'test123';
      const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
      
      await testEnv.db.query(`
        INSERT INTO smiths (id, email, name, password_hash, role, permissions, is_active)
        VALUES (
          gen_random_uuid(),
          'test@sepulki.com',
          'Test Smith',
          $1,
          'OVER_SMITH',
          ARRAY['FORGE_SEPULKA'],
          true
        )
      `, [passwordHash]);

      const context = await createMockContext();

      const result = await authResolvers.Mutation.login(
        null,
        {
          credentials: {
            email: 'TEST@SEPULKI.COM',
            password: 'test123',
          },
        },
        context as any
      );

      expect(result.smith.email).toBe('test@sepulki.com');
    });

    test('does not login inactive smiths', async () => {
      const password = 'test123';
      const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
      
      await testEnv.db.query(`
        INSERT INTO smiths (id, email, name, password_hash, role, permissions, is_active)
        VALUES (
          gen_random_uuid(),
          'inactive@sepulki.com',
          'Inactive Smith',
          $1,
          'OVER_SMITH',
          ARRAY['FORGE_SEPULKA'],
          false
        )
      `, [passwordHash]);

      const context = await createMockContext();

      await expect(
        authResolvers.Mutation.login(
          null,
          {
            credentials: {
              email: 'inactive@sepulki.com',
              password: 'test123',
            },
          },
          context as any
        )
      ).rejects.toThrow(AuthenticationError);
    });

    test('updates last login timestamp', async () => {
      const password = 'test123';
      const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
      
      const smithResult = await testEnv.db.query(`
        INSERT INTO smiths (id, email, name, password_hash, role, permissions, is_active)
        VALUES (
          gen_random_uuid(),
          'test@sepulki.com',
          'Test Smith',
          $1,
          'OVER_SMITH',
          ARRAY['FORGE_SEPULKA'],
          true
        )
        RETURNING id
      `, [passwordHash]);

      const smithId = smithResult.rows[0].id;
      const context = await createMockContext();

      await authResolvers.Mutation.login(
        null,
        {
          credentials: {
            email: 'test@sepulki.com',
            password: 'test123',
          },
        },
        context as any
      );

      const updatedSmith = await testEnv.db.query(
        'SELECT last_login_at FROM smiths WHERE id = $1',
        [smithId]
      );

      expect(updatedSmith.rows[0].last_login_at).toBeTruthy();
    });
  });

  describe('refreshToken', () => {
    const createSession = async (smithId: string, refreshToken: string) => {
      const sessionKey = `session:${crypto.randomUUID()}`;
      const session = {
        smithId,
        token: 'old-token',
        refreshToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        permissions: ['FORGE_SEPULKA'],
        role: 'OVER_SMITH',
      };

      await testEnv.redis.setex(sessionKey, 24 * 60 * 60, JSON.stringify(session));
      return sessionKey;
    };

    test('successfully refreshes token with valid refresh token', async () => {
      const smithResult = await testEnv.db.query(`
        INSERT INTO smiths (id, email, name, password_hash, role, permissions, is_active)
        VALUES (
          gen_random_uuid(),
          'test@sepulki.com',
          'Test Smith',
          encode(digest('test123', 'sha256'), 'hex'),
          'OVER_SMITH',
          ARRAY['FORGE_SEPULKA'],
          true
        )
        RETURNING id
      `);

      const smithId = smithResult.rows[0].id;
      const refreshToken = crypto.randomUUID();
      const sessionKey = await createSession(smithId, refreshToken);

      const context = {
        db: testEnv.db,
        redis: testEnv.redis,
        dataloaders: (await testEnv.createAuthenticatedContext()).dataloaders,
      };

      const result = await authResolvers.Mutation.refreshToken(
        null,
        { refreshToken },
        context as any
      );

      expect(result.smith).toBeDefined();
      expect(result.session).toBeDefined();
      expect(result.session.token).toBeTruthy();
      expect(result.session.token).not.toBe('old-token');
      expect(result.session.refreshToken).toBeTruthy();
      expect(result.session.refreshToken).not.toBe(refreshToken);

      // Old session should be removed
      const oldSession = await testEnv.redis.get(sessionKey);
      expect(oldSession).toBeNull();
    });

    test('throws AuthenticationError for invalid refresh token', async () => {
      const context = {
        db: testEnv.db,
        redis: testEnv.redis,
        dataloaders: (await testEnv.createAuthenticatedContext()).dataloaders,
      };

      await expect(
        authResolvers.Mutation.refreshToken(
          null,
          { refreshToken: 'invalid-token' },
          context as any
        )
      ).rejects.toThrow(AuthenticationError);
    });

    test('throws AuthenticationError for expired session', async () => {
      const smithResult = await testEnv.db.query(`
        INSERT INTO smiths (id, email, name, password_hash, role, permissions, is_active)
        VALUES (
          gen_random_uuid(),
          'test@sepulki.com',
          'Test Smith',
          encode(digest('test123', 'sha256'), 'hex'),
          'OVER_SMITH',
          ARRAY['FORGE_SEPULKA'],
          true
        )
        RETURNING id
      `);

      const smithId = smithResult.rows[0].id;
      const refreshToken = crypto.randomUUID();
      const sessionKey = `session:${crypto.randomUUID()}`;
      const expiredSession = {
        smithId,
        token: 'old-token',
        refreshToken,
        expiresAt: new Date(Date.now() - 1000), // Expired
        permissions: ['FORGE_SEPULKA'],
        role: 'OVER_SMITH',
      };

      await testEnv.redis.setex(sessionKey, 1, JSON.stringify(expiredSession));

      const context = {
        db: testEnv.db,
        redis: testEnv.redis,
        dataloaders: (await testEnv.createAuthenticatedContext()).dataloaders,
      };

      await expect(
        authResolvers.Mutation.refreshToken(
          null,
          { refreshToken },
          context as any
        )
      ).rejects.toThrow(AuthenticationError);

      // Session should be deleted
      const deletedSession = await testEnv.redis.get(sessionKey);
      expect(deletedSession).toBeNull();
    });
  });

  describe('logout', () => {
    test('successfully logs out authenticated user', async () => {
      const context = await testEnv.createAuthenticatedContext();

      const result = await authResolvers.Mutation.logout(
        null,
        {},
        context as any
      );

      expect(result).toBe(true);
    });
  });

  describe('Smith preferences', () => {
    test('returns default preferences when none set', async () => {
      const context = await testEnv.createAuthenticatedContext();

      const result = await authResolvers.Smith.preferences(
        { id: 'test-smith', preferences: null },
        {},
        context as any
      );

      expect(result).toBeDefined();
      expect(result.theme).toBe('auto');
      expect(result.language).toBe('en');
      expect(result.timezone).toBe('UTC');
      expect(result.notifications.email).toBe(true);
      expect(result.notifications.push).toBe(false);
    });

    test('returns existing preferences when set', async () => {
      const customPreferences = {
        theme: 'dark' as const,
        language: 'es',
        timezone: 'America/New_York',
        notifications: {
          email: false,
          push: true,
        },
        dashboard: {
          defaultView: 'tasks',
          widgets: ['fleets'],
        },
      };

      const context = await testEnv.createAuthenticatedContext();

      const result = await authResolvers.Smith.preferences(
        { id: 'test-smith', preferences: customPreferences },
        {},
        context as any
      );

      expect(result).toEqual(customPreferences);
    });
  });
});

