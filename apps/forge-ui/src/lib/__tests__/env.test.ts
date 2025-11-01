// Unit tests for environment configuration
// Tests environment detection and configuration values

describe('env configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Environment Detection', () => {
    test('detects development environment', () => {
      process.env.NODE_ENV = 'development';

      const { env } = require('../env');

      expect(env.isDevelopment).toBe(true);
      expect(env.isProduction).toBe(false);
      expect(env.isTest).toBe(false);
    });

    test('detects production environment', () => {
      process.env.NODE_ENV = 'production';

      const { env } = require('../env');

      expect(env.isDevelopment).toBe(false);
      expect(env.isProduction).toBe(true);
      expect(env.isTest).toBe(false);
    });

    test('detects test environment', () => {
      process.env.NODE_ENV = 'test';

      const { env } = require('../env');

      expect(env.isDevelopment).toBe(false);
      expect(env.isProduction).toBe(false);
      expect(env.isTest).toBe(true);
    });
  });

  describe('Deployment Platform Detection', () => {
    test('detects Vercel platform', () => {
      process.env.VERCEL = '1';
      process.env.NODE_ENV = 'production';

      const { env } = require('../env');

      expect(env.deploymentPlatform).toBe('vercel');
    });

    test('detects Railway platform', () => {
      delete process.env.VERCEL;
      process.env.RAILWAY_STATIC_URL = 'https://example.railway.app';
      process.env.NODE_ENV = 'production';

      const { env } = require('../env');

      expect(env.deploymentPlatform).toBe('railway');
    });

    test('detects Kubernetes platform', () => {
      delete process.env.RAILWAY_STATIC_URL;
      process.env.KUBERNETES_SERVICE_HOST = 'kubernetes';
      process.env.NODE_ENV = 'production';

      const { env } = require('../env');

      expect(env.deploymentPlatform).toBe('kubernetes');
    });

    test('detects Docker platform', () => {
      delete process.env.KUBERNETES_SERVICE_HOST;
      process.env.DOCKER_CONTAINER = '1';
      process.env.NODE_ENV = 'production';

      const { env } = require('../env');

      expect(env.deploymentPlatform).toBe('docker');
    });

    test('defaults to local platform', () => {
      delete process.env.VERCEL;
      delete process.env.RAILWAY_STATIC_URL;
      delete process.env.KUBERNETES_SERVICE_HOST;
      delete process.env.DOCKER_CONTAINER;
      process.env.NODE_ENV = 'development';

      const { env } = require('../env');

      expect(env.deploymentPlatform).toBe('local');
    });
  });

  describe('GraphQL Endpoint Configuration', () => {
    test('uses custom endpoint when provided', () => {
      process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT = 'https://custom.graphql.endpoint';

      const { env } = require('../env');

      expect(env.graphqlEndpoint).toBe('https://custom.graphql.endpoint');
    });

    test('defaults to localhost in development', () => {
      delete process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT;
      process.env.NODE_ENV = 'development';

      const { env } = require('../env');

      expect(env.graphqlEndpoint).toBe('http://localhost:4000/graphql');
    });

    test('uses Vercel URL in production when available', () => {
      delete process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT;
      process.env.VERCEL_URL = 'example.vercel.app';
      process.env.NODE_ENV = 'production';

      const { env } = require('../env');

      expect(env.graphqlEndpoint).toBe('https://example.vercel.app/api/graphql');
    });
  });

  describe('Authentication Configuration', () => {
    test('enables real auth in production', () => {
      process.env.NODE_ENV = 'production';

      const { env, shouldUseRealAuth } = require('../env');

      expect(env.useRealAuth).toBe(true);
      expect(shouldUseRealAuth()).toBe(true);
    });

    test('enables real auth when GitHub client ID provided', () => {
      process.env.NODE_ENV = 'development';
      process.env.GITHUB_CLIENT_ID = 'test-client-id';

      const { env, shouldUseRealAuth } = require('../env');

      expect(env.useRealAuth).toBe(true);
      expect(shouldUseRealAuth()).toBe(true);
    });

    test('enables real auth when Google client ID provided', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.GITHUB_CLIENT_ID;
      process.env.GOOGLE_CLIENT_ID = 'test-client-id';

      const { env, shouldUseRealAuth } = require('../env');

      expect(env.useRealAuth).toBe(true);
    });

    test('uses mock auth in development when no providers', () => {
      delete process.env.GITHUB_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_ID;
      process.env.NODE_ENV = 'development';

      const { env, shouldUseMockAuth } = require('../env');

      expect(env.authProviders).toContain('mock');
      expect(shouldUseMockAuth()).toBe(true);
    });
  });

  describe('Service Endpoint Configuration', () => {
    test('uses custom anvil sim endpoint when provided', () => {
      process.env.NEXT_PUBLIC_ANVIL_SIM_ENDPOINT = 'https://custom.anvil.endpoint';

      const { env } = require('../env');

      expect(env.anvilSimEndpoint).toBe('https://custom.anvil.endpoint');
    });

    test('defaults to localhost for anvil sim', () => {
      delete process.env.NEXT_PUBLIC_ANVIL_SIM_ENDPOINT;
      process.env.NODE_ENV = 'development';

      const { env } = require('../env');

      expect(env.anvilSimEndpoint).toBe('http://localhost:8002');
    });

    test('configures video proxy URL', () => {
      process.env.NEXT_PUBLIC_VIDEO_PROXY_URL = 'https://custom.video.proxy';

      const { env } = require('../env');

      expect(env.videoProxyUrl).toBe('https://custom.video.proxy');
    });

    test('defaults video proxy to localhost', () => {
      delete process.env.NEXT_PUBLIC_VIDEO_PROXY_URL;
      process.env.NODE_ENV = 'development';

      const { env } = require('../env');

      expect(env.videoProxyUrl).toBe('http://localhost:8889');
    });
  });

  describe('Helper Functions', () => {
    test('isLocal returns true in development', () => {
      process.env.NODE_ENV = 'development';

      const { isLocal } = require('../env');

      expect(isLocal()).toBe(true);
    });

    test('isProduction returns true in production', () => {
      process.env.NODE_ENV = 'production';

      const { isProduction } = require('../env');

      expect(isProduction()).toBe(true);
    });
  });
});

