"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceError = exports.ConflictError = exports.NotFoundError = exports.ValidationError = exports.AuthorizationError = exports.AuthenticationError = void 0;
const graphql_1 = require("graphql");
class AuthenticationError extends graphql_1.GraphQLError {
    constructor(message) {
        super(message, {
            extensions: {
                code: 'UNAUTHENTICATED',
                http: { status: 401 }
            }
        });
    }
}
exports.AuthenticationError = AuthenticationError;
class AuthorizationError extends graphql_1.GraphQLError {
    constructor(message) {
        super(message, {
            extensions: {
                code: 'FORBIDDEN',
                http: { status: 403 }
            }
        });
    }
}
exports.AuthorizationError = AuthorizationError;
class ValidationError extends graphql_1.GraphQLError {
    constructor(message, field) {
        super(message, {
            extensions: {
                code: 'VALIDATION_ERROR',
                field,
                http: { status: 400 }
            }
        });
    }
}
exports.ValidationError = ValidationError;
class NotFoundError extends graphql_1.GraphQLError {
    constructor(resource, id) {
        super(`${resource}${id ? ` with id ${id}` : ''} not found`, {
            extensions: {
                code: 'NOT_FOUND',
                resource,
                id,
                http: { status: 404 }
            }
        });
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends graphql_1.GraphQLError {
    constructor(message) {
        super(message, {
            extensions: {
                code: 'CONFLICT',
                http: { status: 409 }
            }
        });
    }
}
exports.ConflictError = ConflictError;
class ServiceError extends graphql_1.GraphQLError {
    constructor(service, message) {
        super(`${service} service error: ${message}`, {
            extensions: {
                code: 'SERVICE_ERROR',
                service,
                http: { status: 500 }
            }
        });
    }
}
exports.ServiceError = ServiceError;
