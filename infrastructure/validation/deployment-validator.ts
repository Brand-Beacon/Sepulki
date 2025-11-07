#!/usr/bin/env ts-node

/**
 * Deployment Infrastructure Validator
 *
 * Validates all deployed services against production readiness criteria:
 * - Health checks
 * - Database connectivity
 * - Redis connectivity
 * - Environment configuration
 * - API endpoints
 * - Authentication flows
 */

import fetch from 'node-fetch';
import { createClient } from '@vercel/postgres';
import Redis from 'ioredis';

interface ServiceStatus {
  name: string;
  url: string;
  status: 'healthy' | 'unhealthy' | 'unreachable';
  responseTime?: number;
  errors: string[];
  warnings: string[];
  details?: Record<string, any>;
}

interface ValidationReport {
  timestamp: string;
  overallStatus: 'pass' | 'fail' | 'partial';
  services: ServiceStatus[];
  criticalIssues: string[];
  warnings: string[];
  recommendations: string[];
}

class DeploymentValidator {
  private report: ValidationReport = {
    timestamp: new Date().toISOString(),
    overallStatus: 'pass',
    services: [],
    criticalIssues: [],
    warnings: [],
    recommendations: []
  };

  /**
   * Validate Frontend (Vercel)
   */
  async validateFrontend(url: string): Promise<ServiceStatus> {
    const status: ServiceStatus = {
      name: 'Frontend (Vercel)',
      url,
      status: 'healthy',
      errors: [],
      warnings: [],
      details: {}
    };

    try {
      const startTime = Date.now();
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Deployment-Validator/1.0'
        },
        timeout: 10000
      });
      status.responseTime = Date.now() - startTime;

      if (!response.ok) {
        status.status = 'unhealthy';
        status.errors.push(`HTTP ${response.status}: ${response.statusText}`);
        return status;
      }

      const html = await response.text();

      // Check for critical UI elements
      if (!html.includes('<!DOCTYPE html>') && !html.includes('<html')) {
        status.warnings.push('HTML structure might be incomplete');
      }

      // Check for Next.js artifacts
      if (!html.includes('_next') && !html.includes('__NEXT_DATA__')) {
        status.warnings.push('Next.js artifacts not detected - might not be properly built');
      }

      // Performance checks
      if (status.responseTime > 3000) {
        status.warnings.push(`Slow response time: ${status.responseTime}ms (recommended: <3000ms)`);
      }

      status.details = {
        responseTime: `${status.responseTime}ms`,
        htmlSize: `${(html.length / 1024).toFixed(2)} KB`,
        hasNextJS: html.includes('_next'),
        statusCode: response.status
      };

    } catch (error) {
      status.status = 'unreachable';
      status.errors.push(`Failed to reach frontend: ${error.message}`);
    }

    return status;
  }

  /**
   * Validate Backend Service (Railway)
   */
  async validateBackendService(
    name: string,
    baseUrl: string,
    endpoints: { path: string; method: string; requiresAuth?: boolean }[]
  ): Promise<ServiceStatus> {
    const status: ServiceStatus = {
      name,
      url: baseUrl,
      status: 'healthy',
      errors: [],
      warnings: [],
      details: { endpoints: {} }
    };

    try {
      // Health check
      const healthStart = Date.now();
      const healthResponse = await fetch(`${baseUrl}/health`, {
        method: 'GET',
        timeout: 10000
      });
      const healthTime = Date.now() - healthStart;

      if (!healthResponse.ok) {
        status.status = 'unhealthy';
        status.errors.push(`Health check failed: HTTP ${healthResponse.status}`);
      }

      const healthData = await healthResponse.json();
      status.details.health = {
        responseTime: `${healthTime}ms`,
        ...healthData
      };

      // Validate each endpoint
      for (const endpoint of endpoints) {
        try {
          const endpointStart = Date.now();
          const endpointResponse = await fetch(`${baseUrl}${endpoint.path}`, {
            method: endpoint.method,
            headers: {
              'Content-Type': 'application/json',
              ...(endpoint.requiresAuth ? {} : {}) // Add auth header if needed
            },
            timeout: 10000
          });
          const endpointTime = Date.now() - endpointStart;

          status.details.endpoints[endpoint.path] = {
            status: endpointResponse.status,
            responseTime: `${endpointTime}ms`,
            ok: endpointResponse.ok || (endpoint.requiresAuth && endpointResponse.status === 401)
          };

          // 401 is expected for protected endpoints without auth
          if (endpoint.requiresAuth && endpointResponse.status === 401) {
            // This is good - endpoint is properly protected
            continue;
          }

          if (!endpointResponse.ok) {
            status.warnings.push(
              `Endpoint ${endpoint.path} returned ${endpointResponse.status}`
            );
          }
        } catch (error) {
          status.details.endpoints[endpoint.path] = {
            error: error.message
          };
          status.warnings.push(`Failed to test endpoint ${endpoint.path}: ${error.message}`);
        }
      }

      // Check for dependency connectivity in health response
      if (healthData.dependencies) {
        const deps = healthData.dependencies;
        if (deps.database !== 'connected') {
          status.errors.push('Database connection failed');
          status.status = 'unhealthy';
        }
        if (deps.cache !== 'connected') {
          status.warnings.push('Redis cache connection failed');
        }
      }

    } catch (error) {
      status.status = 'unreachable';
      status.errors.push(`Failed to reach service: ${error.message}`);
    }

    return status;
  }

  /**
   * Validate Database (Neon)
   */
  async validateDatabase(connectionString: string): Promise<ServiceStatus> {
    const status: ServiceStatus = {
      name: 'Database (Neon PostgreSQL)',
      url: 'neon.tech',
      status: 'healthy',
      errors: [],
      warnings: [],
      details: {}
    };

    let client;
    try {
      const startTime = Date.now();
      client = createClient({
        connectionString
      });
      await client.connect();
      const connectTime = Date.now() - startTime;

      status.details.connectionTime = `${connectTime}ms`;

      // Test query
      const queryStart = Date.now();
      const result = await client.query('SELECT version(), current_database(), current_user');
      const queryTime = Date.now() - queryStart;

      status.details.queryTime = `${queryTime}ms`;
      status.details.version = result.rows[0].version;
      status.details.database = result.rows[0].current_database;
      status.details.user = result.rows[0].current_user;

      // Test connection pooling
      try {
        const poolTest = await Promise.all([
          client.query('SELECT 1'),
          client.query('SELECT 1'),
          client.query('SELECT 1')
        ]);
        status.details.connectionPooling = 'working';
      } catch (error) {
        status.warnings.push('Connection pooling test failed');
      }

      // Check for essential tables
      const tablesResult = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
      `);

      status.details.tableCount = tablesResult.rows.length;
      status.details.tables = tablesResult.rows.map(r => r.table_name);

      if (tablesResult.rows.length === 0) {
        status.warnings.push('No tables found - migrations may not have run');
      }

    } catch (error) {
      status.status = 'unreachable';
      status.errors.push(`Database connection failed: ${error.message}`);
    } finally {
      if (client) {
        await client.end();
      }
    }

    return status;
  }

  /**
   * Validate Redis (Upstash)
   */
  async validateRedis(connectionUrl: string): Promise<ServiceStatus> {
    const status: ServiceStatus = {
      name: 'Redis (Upstash)',
      url: 'upstash.com',
      status: 'healthy',
      errors: [],
      warnings: [],
      details: {}
    };

    let redis;
    try {
      const startTime = Date.now();
      redis = new Redis(connectionUrl, {
        connectTimeout: 10000,
        maxRetriesPerRequest: 3
      });

      // Wait for connection
      await redis.ping();
      const connectTime = Date.now() - startTime;
      status.details.connectionTime = `${connectTime}ms`;

      // Test basic operations
      const testKey = `validator:test:${Date.now()}`;
      const testValue = 'deployment-validation';

      // SET operation
      const setStart = Date.now();
      await redis.set(testKey, testValue, 'EX', 60);
      status.details.setTime = `${Date.now() - setStart}ms`;

      // GET operation
      const getStart = Date.now();
      const retrieved = await redis.get(testKey);
      status.details.getTime = `${Date.now() - getStart}ms`;

      if (retrieved !== testValue) {
        status.errors.push('Redis SET/GET validation failed');
        status.status = 'unhealthy';
      }

      // DEL operation
      await redis.del(testKey);

      // Get Redis info
      const info = await redis.info('server');
      const versionMatch = info.match(/redis_version:(\S+)/);
      if (versionMatch) {
        status.details.version = versionMatch[1];
      }

      status.details.operations = 'working';

    } catch (error) {
      status.status = 'unreachable';
      status.errors.push(`Redis connection failed: ${error.message}`);
    } finally {
      if (redis) {
        await redis.quit();
      }
    }

    return status;
  }

  /**
   * Validate Environment Variables
   */
  async validateEnvironment(): Promise<ServiceStatus> {
    const status: ServiceStatus = {
      name: 'Environment Configuration',
      url: 'N/A',
      status: 'healthy',
      errors: [],
      warnings: [],
      details: { required: {}, optional: {} }
    };

    const requiredVars = [
      'DATABASE_URL',
      'REDIS_URL',
      'JWT_SECRET',
      'NEXT_PUBLIC_GRAPHQL_ENDPOINT',
      'NEXT_PUBLIC_AUTH_ENDPOINT'
    ];

    const optionalVars = [
      'SENTRY_DSN',
      'ANALYTICS_ID',
      'LOG_LEVEL'
    ];

    // Check required variables
    for (const varName of requiredVars) {
      const exists = !!process.env[varName];
      status.details.required[varName] = exists ? '✓ Set' : '✗ Missing';

      if (!exists) {
        status.errors.push(`Required environment variable missing: ${varName}`);
        status.status = 'unhealthy';
      }
    }

    // Check optional variables
    for (const varName of optionalVars) {
      const exists = !!process.env[varName];
      status.details.optional[varName] = exists ? '✓ Set' : '○ Not Set';

      if (!exists) {
        status.warnings.push(`Optional environment variable not set: ${varName}`);
      }
    }

    return status;
  }

  /**
   * Run complete validation suite
   */
  async runValidation(): Promise<ValidationReport> {
    console.log('🔍 Starting deployment validation...\n');

    // Validate environment first
    console.log('📋 Validating environment configuration...');
    const envStatus = await this.validateEnvironment();
    this.report.services.push(envStatus);

    if (envStatus.status === 'unhealthy') {
      this.report.overallStatus = 'fail';
      this.report.criticalIssues.push(
        'Environment validation failed - cannot proceed with service validation'
      );
      return this.report;
    }

    // Validate services in parallel
    console.log('🌐 Validating deployed services...\n');

    const validations = await Promise.allSettled([
      // Frontend
      this.validateFrontend(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),

      // Hammer Orchestrator
      this.validateBackendService(
        'Hammer Orchestrator (Railway)',
        process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT?.replace('/graphql', '') ||
        'https://hammer-orchestrator-production.up.railway.app',
        [
          { path: '/health', method: 'GET' },
          { path: '/graphql', method: 'POST', requiresAuth: false }
        ]
      ),

      // Local Auth
      this.validateBackendService(
        'Local Auth (Railway)',
        process.env.NEXT_PUBLIC_AUTH_ENDPOINT ||
        'https://local-auth-production.up.railway.app',
        [
          { path: '/health', method: 'GET' },
          { path: '/auth/signin', method: 'POST', requiresAuth: false },
          { path: '/auth/signup', method: 'POST', requiresAuth: false }
        ]
      ),

      // Database
      process.env.DATABASE_URL ?
        this.validateDatabase(process.env.DATABASE_URL) :
        Promise.resolve({
          name: 'Database (Neon PostgreSQL)',
          url: 'neon.tech',
          status: 'unhealthy' as const,
          errors: ['DATABASE_URL not configured'],
          warnings: []
        }),

      // Redis
      process.env.REDIS_URL ?
        this.validateRedis(process.env.REDIS_URL) :
        Promise.resolve({
          name: 'Redis (Upstash)',
          url: 'upstash.com',
          status: 'unhealthy' as const,
          errors: ['REDIS_URL not configured'],
          warnings: []
        })
    ]);

    // Process results
    validations.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const serviceStatus = result.value;
        this.report.services.push(serviceStatus);

        if (serviceStatus.status === 'unhealthy') {
          this.report.overallStatus = this.report.overallStatus === 'fail' ? 'fail' : 'partial';
          this.report.criticalIssues.push(
            `${serviceStatus.name}: ${serviceStatus.errors.join(', ')}`
          );
        } else if (serviceStatus.status === 'unreachable') {
          this.report.overallStatus = 'fail';
          this.report.criticalIssues.push(
            `${serviceStatus.name} is unreachable: ${serviceStatus.errors.join(', ')}`
          );
        }

        this.report.warnings.push(...serviceStatus.warnings);
      } else {
        this.report.overallStatus = 'fail';
        this.report.criticalIssues.push(
          `Validation failed: ${result.reason?.message || 'Unknown error'}`
        );
      }
    });

    // Generate recommendations
    this.generateRecommendations();

    return this.report;
  }

  /**
   * Generate recommendations based on findings
   */
  private generateRecommendations(): void {
    const unhealthyServices = this.report.services.filter(s => s.status !== 'healthy');

    if (unhealthyServices.length === 0) {
      this.report.recommendations.push('✅ All services are healthy and production-ready');
      return;
    }

    if (unhealthyServices.some(s => s.name.includes('Database'))) {
      this.report.recommendations.push(
        '🔧 Database issues detected - verify DATABASE_URL and run migrations'
      );
    }

    if (unhealthyServices.some(s => s.name.includes('Redis'))) {
      this.report.recommendations.push(
        '🔧 Redis issues detected - verify REDIS_URL and Upstash configuration'
      );
    }

    if (unhealthyServices.some(s => s.name.includes('Frontend'))) {
      this.report.recommendations.push(
        '🔧 Frontend issues detected - check Vercel deployment logs and build status'
      );
    }

    if (unhealthyServices.some(s => s.name.includes('Railway'))) {
      this.report.recommendations.push(
        '🔧 Backend service issues detected - check Railway deployment logs and environment variables'
      );
    }

    if (this.report.warnings.length > 5) {
      this.report.recommendations.push(
        '⚠️ Multiple warnings detected - review service configurations and performance'
      );
    }
  }

  /**
   * Print formatted report
   */
  printReport(): void {
    console.log('\n' + '='.repeat(80));
    console.log('DEPLOYMENT VALIDATION REPORT');
    console.log('='.repeat(80));
    console.log(`Timestamp: ${this.report.timestamp}`);
    console.log(`Overall Status: ${this.getStatusEmoji(this.report.overallStatus)} ${this.report.overallStatus.toUpperCase()}`);
    console.log('='.repeat(80));

    // Services
    console.log('\n📊 SERVICE STATUS:\n');
    this.report.services.forEach(service => {
      console.log(`${this.getStatusEmoji(service.status)} ${service.name}`);
      console.log(`   URL: ${service.url}`);
      if (service.responseTime) {
        console.log(`   Response Time: ${service.responseTime}ms`);
      }

      if (service.errors.length > 0) {
        console.log(`   ❌ Errors:`);
        service.errors.forEach(err => console.log(`      - ${err}`));
      }

      if (service.warnings.length > 0) {
        console.log(`   ⚠️  Warnings:`);
        service.warnings.forEach(warn => console.log(`      - ${warn}`));
      }

      if (service.details && Object.keys(service.details).length > 0) {
        console.log(`   📋 Details:`, JSON.stringify(service.details, null, 6));
      }
      console.log('');
    });

    // Critical Issues
    if (this.report.criticalIssues.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES:\n');
      this.report.criticalIssues.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue}`);
      });
    }

    // Recommendations
    if (this.report.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:\n');
      this.report.recommendations.forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('END REPORT');
    console.log('='.repeat(80) + '\n');
  }

  private getStatusEmoji(status: string): string {
    switch (status) {
      case 'healthy':
      case 'pass':
        return '✅';
      case 'unhealthy':
      case 'partial':
        return '⚠️';
      case 'unreachable':
      case 'fail':
        return '❌';
      default:
        return '❓';
    }
  }
}

// Main execution
async function main() {
  const validator = new DeploymentValidator();

  try {
    const report = await validator.runValidation();
    validator.printReport();

    // Exit with appropriate code
    if (report.overallStatus === 'pass') {
      process.exit(0);
    } else if (report.overallStatus === 'partial') {
      process.exit(1);
    } else {
      process.exit(2);
    }
  } catch (error) {
    console.error('❌ Validation failed with error:', error);
    process.exit(3);
  }
}

if (require.main === module) {
  main();
}

export { DeploymentValidator, ValidationReport, ServiceStatus };
