// Unit tests for error classes
// Tests error instantiation and GraphQL error formatting

import {
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  ConflictError,
  ServiceError,
} from '../src/errors';

describe('Error Classes', () => {
  describe('AuthenticationError', () => {
    test('creates error with correct code and status', () => {
      const error = new AuthenticationError('Invalid credentials');

      expect(error.message).toBe('Invalid credentials');
      expect(error.extensions.code).toBe('UNAUTHENTICATED');
      expect(error.extensions.http?.status).toBe(401);
    });

    test('extends GraphQLError', () => {
      const error = new AuthenticationError('Test error');

      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('AuthorizationError', () => {
    test('creates error with correct code and status', () => {
      const error = new AuthorizationError('Permission denied');

      expect(error.message).toBe('Permission denied');
      expect(error.extensions.code).toBe('FORBIDDEN');
      expect(error.extensions.http?.status).toBe(403);
    });
  });

  describe('ValidationError', () => {
    test('creates error with correct code and status', () => {
      const error = new ValidationError('Invalid input');

      expect(error.message).toBe('Invalid input');
      expect(error.extensions.code).toBe('VALIDATION_ERROR');
      expect(error.extensions.http?.status).toBe(400);
    });

    test('includes field in extensions when provided', () => {
      const error = new ValidationError('Invalid email format', 'email');

      expect(error.extensions.field).toBe('email');
    });

    test('omits field when not provided', () => {
      const error = new ValidationError('Invalid input');

      expect(error.extensions.field).toBeUndefined();
    });
  });

  describe('NotFoundError', () => {
    test('creates error with correct code and status', () => {
      const error = new NotFoundError('Fleet', 'fleet-123');

      expect(error.message).toBe('Fleet with id fleet-123 not found');
      expect(error.extensions.code).toBe('NOT_FOUND');
      expect(error.extensions.http?.status).toBe(404);
      expect(error.extensions.resource).toBe('Fleet');
      expect(error.extensions.id).toBe('fleet-123');
    });

    test('omits id when not provided', () => {
      const error = new NotFoundError('Fleet');

      expect(error.message).toBe('Fleet not found');
      expect(error.extensions.id).toBeUndefined();
    });
  });

  describe('ConflictError', () => {
    test('creates error with correct code and status', () => {
      const error = new ConflictError('Resource already exists');

      expect(error.message).toBe('Resource already exists');
      expect(error.extensions.code).toBe('CONFLICT');
      expect(error.extensions.http?.status).toBe(409);
    });
  });

  describe('ServiceError', () => {
    test('creates error with correct code and status', () => {
      const error = new ServiceError('database', 'Connection timeout');

      expect(error.message).toBe('database service error: Connection timeout');
      expect(error.extensions.code).toBe('SERVICE_ERROR');
      expect(error.extensions.service).toBe('database');
      expect(error.extensions.http?.status).toBe(500);
    });

    test('includes service name in message', () => {
      const error = new ServiceError('redis', 'Cache miss');

      expect(error.message).toContain('redis service error');
      expect(error.extensions.service).toBe('redis');
    });
  });

  describe('Error Formatting for GraphQL', () => {
    test('all errors have extensions property', () => {
      const errors = [
        new AuthenticationError('Auth error'),
        new AuthorizationError('Authz error'),
        new ValidationError('Validation error'),
        new NotFoundError('Resource'),
        new ConflictError('Conflict error'),
        new ServiceError('service', 'Service error'),
      ];

      errors.forEach((error) => {
        expect(error.extensions).toBeDefined();
        expect(error.extensions.code).toBeDefined();
        expect(error.extensions.http).toBeDefined();
        expect(error.extensions.http?.status).toBeDefined();
      });
    });

    test('errors are serializable for GraphQL responses', () => {
      const error = new NotFoundError('Fleet', 'fleet-123');

      // Should be able to serialize to JSON
      const serialized = JSON.parse(JSON.stringify(error));

      expect(serialized.extensions).toBeDefined();
      expect(serialized.extensions.code).toBe('NOT_FOUND');
    });
  });
});

