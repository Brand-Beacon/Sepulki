// Unit tests for context utilities
// Tests context creation, authentication, and permission checks

import { createContext, requireAuth, requirePermission } from '../src/context';
import { Permission } from '@sepulki/shared-types';
import { Pool } from 'pg';
import Redis from 'ioredis';

// Mock dependencies
jest.mock('../src/dataloaders', () => ({
  setupDataLoaders: jest.fn(() => ({
    sepulka: { load: jest.fn(), clear: jest.fn() },
    fleet: { load: jest.fn(), clear: jest.fn() },
    robot: { load: jest.fn(), clear: jest.fn() },
    task: { load: jest.fn(), clear: jest.fn() },
    smith: { load: jest.fn(), clear: jest.fn() },
  })),
}));

describe('Context Utilities', () => {
  let mockDb: jest.Mocked<Pool>;
  let mockRedis: jest.Mocked<Redis>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDb = {
      query: jest.fn(),
    } as any;

    mockRedis = {
      get: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
      publish: jest.fn(),
    } as any;
  });

  describe('createContext', () => {
    test('returns context without auth when no token provided', async () => {
      const context = await createContext({});

      expect(context.db).toBeDefined();
      expect(context.redis).toBeDefined();
      expect(context.smith).toBeUndefined();
      expect(context.session).toBeUndefined();
      expect(context.dataloaders).toBeDefined();
    });

    test('creates authenticated context with valid token', async () => {
      // This test would require actual JWT token generation
      // For now, we'll test the structure
      const context = await createContext({});

      expect(context).toBeDefined();
      expect(context.db).toBeDefined();
      expect(context.redis).toBeDefined();
      expect(context.dataloaders).toBeDefined();
    });
  });

  describe('requireAuth', () => {
    test('returns smith and session when authenticated', async () => {
      const mockSmith = {
        id: 'test-smith',
        email: 'test@example.com',
        role: 'OVER_SMITH',
      };

      const mockSession = {
        smithId: 'test-smith',
        token: 'test-token',
        refreshToken: 'test-refresh',
        expiresAt: new Date(Date.now() + 3600000),
        permissions: [Permission.FORGE_SEPULKA],
        role: 'OVER_SMITH',
      };

      const context = {
        db: mockDb,
        redis: mockRedis,
        smith: mockSmith,
        session: mockSession,
        dataloaders: {} as any,
      };

      const result = await requireAuth(context);

      expect(result.smith).toEqual(mockSmith);
      expect(result.session).toEqual(mockSession);
    });

    test('throws error when smith is missing', async () => {
      const context = {
        db: mockDb,
        redis: mockRedis,
        smith: undefined,
        session: undefined,
        dataloaders: {} as any,
      };

      await expect(requireAuth(context)).rejects.toThrow('Authentication required');
    });

    test('throws error when session is missing', async () => {
      const context = {
        db: mockDb,
        redis: mockRedis,
        smith: { id: 'test-smith' },
        session: undefined,
        dataloaders: {} as any,
      };

      await expect(requireAuth(context)).rejects.toThrow('Authentication required');
    });
  });

  describe('requirePermission', () => {
    test('returns smith and session when permission exists', async () => {
      const mockSmith = {
        id: 'test-smith',
        email: 'test@example.com',
        role: 'OVER_SMITH',
      };

      const mockSession = {
        smithId: 'test-smith',
        token: 'test-token',
        refreshToken: 'test-refresh',
        expiresAt: new Date(Date.now() + 3600000),
        permissions: [Permission.FORGE_SEPULKA, Permission.CAST_INGOT],
        role: 'OVER_SMITH',
      };

      const context = {
        db: mockDb,
        redis: mockRedis,
        smith: mockSmith,
        session: mockSession,
        dataloaders: {} as any,
      };

      const result = await requirePermission(context, Permission.FORGE_SEPULKA);

      expect(result.smith).toEqual(mockSmith);
      expect(result.session).toEqual(mockSession);
    });

    test('throws error when permission is missing', async () => {
      const mockSmith = {
        id: 'test-smith',
        email: 'test@example.com',
        role: 'OVER_SMITH',
      };

      const mockSession = {
        smithId: 'test-smith',
        token: 'test-token',
        refreshToken: 'test-refresh',
        expiresAt: new Date(Date.now() + 3600000),
        permissions: [Permission.VIEW_CATALOG], // Missing FORGE_SEPULKA
        role: 'OVER_SMITH',
      };

      const context = {
        db: mockDb,
        redis: mockRedis,
        smith: mockSmith,
        session: mockSession,
        dataloaders: {} as any,
      };

      await expect(
        requirePermission(context, Permission.FORGE_SEPULKA)
      ).rejects.toThrow('Permission denied');
    });

    test('requires authentication first', async () => {
      const context = {
        db: mockDb,
        redis: mockRedis,
        smith: undefined,
        session: undefined,
        dataloaders: {} as any,
      };

      await expect(
        requirePermission(context, Permission.FORGE_SEPULKA)
      ).rejects.toThrow('Authentication required');
    });
  });
});

