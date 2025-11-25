/**
 * Custom Error Classes
 * Provides structured error handling across the application
 */

export enum ErrorCode {
  // Validation Errors (400)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Authentication Errors (401)
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  
  // Authorization Errors (403)
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  
  // Not Found Errors (404)
  NOT_FOUND = 'NOT_FOUND',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  PRODUCT_NOT_FOUND = 'PRODUCT_NOT_FOUND',
  
  // Database Errors (500)
  DATABASE_ERROR = 'DATABASE_ERROR',
  DATABASE_CONNECTION_ERROR = 'DATABASE_CONNECTION_ERROR',
  DATABASE_QUERY_ERROR = 'DATABASE_QUERY_ERROR',
  DATABASE_TIMEOUT = 'DATABASE_TIMEOUT',
  
  // Cache Errors (500)
  CACHE_ERROR = 'CACHE_ERROR',
  CACHE_CONNECTION_ERROR = 'CACHE_CONNECTION_ERROR',
  
  // External Service Errors (502)
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  PAYMENT_SERVICE_ERROR = 'PAYMENT_SERVICE_ERROR',
  VOICE_SERVICE_ERROR = 'VOICE_SERVICE_ERROR',
  ML_SERVICE_ERROR = 'ML_SERVICE_ERROR',
  API_TIMEOUT = 'API_TIMEOUT',
  
  // Business Logic Errors (400)
  INVALID_OPERATION = 'INVALID_OPERATION',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  INSUFFICIENT_STOCK = 'INSUFFICIENT_STOCK',
  ORDER_NOT_FOUND = 'ORDER_NOT_FOUND',
  
  // Server Errors (500)
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

export interface ErrorDetails {
  field?: string;
  value?: any;
  reason?: string;
  [key: string]: any;
}

/**
 * Base Application Error
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: ErrorDetails;
  public readonly isOperational: boolean;
  public readonly timestamp: Date;

  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number = 500,
    details?: ErrorDetails,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;
    this.timestamp = new Date();

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        statusCode: this.statusCode,
        details: this.details,
        timestamp: this.timestamp.toISOString(),
      },
    };
  }
}

/**
 * Validation Error (400)
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, ErrorCode.VALIDATION_ERROR, 400, details);
  }
}

/**
 * Authentication Error (401)
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', details?: ErrorDetails) {
    super(message, ErrorCode.UNAUTHORIZED, 401, details);
  }
}

/**
 * Authorization Error (403)
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions', details?: ErrorDetails) {
    super(message, ErrorCode.FORBIDDEN, 403, details);
  }
}

/**
 * Not Found Error (404)
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string, details?: ErrorDetails) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, ErrorCode.NOT_FOUND, 404, { resource, identifier, ...details });
  }
}

/**
 * Database Error (500)
 */
export class DatabaseError extends AppError {
  constructor(message: string, originalError?: Error, details?: ErrorDetails) {
    super(
      message,
      ErrorCode.DATABASE_ERROR,
      500,
      {
        originalError: originalError?.message,
        ...details,
      }
    );
  }
}

/**
 * Database Connection Error (503)
 */
export class DatabaseConnectionError extends AppError {
  constructor(message: string = 'Database connection failed', originalError?: Error) {
    super(
      message,
      ErrorCode.DATABASE_CONNECTION_ERROR,
      503,
      { originalError: originalError?.message }
    );
  }
}

/**
 * Database Query Error (500)
 */
export class DatabaseQueryError extends AppError {
  constructor(query: string, originalError?: Error, details?: ErrorDetails) {
    super(
      'Database query failed',
      ErrorCode.DATABASE_QUERY_ERROR,
      500,
      {
        query: query.substring(0, 200), // Truncate long queries
        originalError: originalError?.message,
        ...details,
      }
    );
  }
}

/**
 * Database Timeout Error (504)
 */
export class DatabaseTimeoutError extends AppError {
  constructor(timeoutMs: number, query?: string) {
    super(
      `Database operation timed out after ${timeoutMs}ms`,
      ErrorCode.DATABASE_TIMEOUT,
      504,
      { timeoutMs, query: query?.substring(0, 200) }
    );
  }
}

/**
 * Cache Error (500)
 */
export class CacheError extends AppError {
  constructor(message: string, originalError?: Error, details?: ErrorDetails) {
    super(
      message,
      ErrorCode.CACHE_ERROR,
      500,
      {
        originalError: originalError?.message,
        ...details,
      }
    );
  }
}

/**
 * Cache Connection Error (503)
 */
export class CacheConnectionError extends AppError {
  constructor(message: string = 'Cache connection failed', originalError?: Error) {
    super(
      message,
      ErrorCode.CACHE_CONNECTION_ERROR,
      503,
      { originalError: originalError?.message }
    );
  }
}

/**
 * External Service Error (502)
 */
export class ExternalServiceError extends AppError {
  constructor(
    serviceName: string,
    message: string,
    originalError?: Error,
    details?: ErrorDetails
  ) {
    super(
      `${serviceName}: ${message}`,
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      502,
      {
        serviceName,
        originalError: originalError?.message,
        ...details,
      }
    );
  }
}

/**
 * API Timeout Error (504)
 */
export class ApiTimeoutError extends AppError {
  constructor(serviceName: string, timeoutMs: number, endpoint?: string) {
    super(
      `${serviceName} API request timed out after ${timeoutMs}ms`,
      ErrorCode.API_TIMEOUT,
      504,
      { serviceName, timeoutMs, endpoint }
    );
  }
}

/**
 * Payment Service Error (402)
 */
export class PaymentError extends AppError {
  constructor(message: string, originalError?: Error, details?: ErrorDetails) {
    super(
      message,
      ErrorCode.PAYMENT_SERVICE_ERROR,
      402,
      {
        originalError: originalError?.message,
        ...details,
      }
    );
  }
}

/**
 * Business Logic Error (400)
 */
export class BusinessLogicError extends AppError {
  constructor(message: string, code: ErrorCode = ErrorCode.INVALID_OPERATION, details?: ErrorDetails) {
    super(message, code, 400, details);
  }
}

/**
 * Service Unavailable Error (503)
 */
export class ServiceUnavailableError extends AppError {
  constructor(serviceName: string, message: string = 'Service temporarily unavailable') {
    super(
      `${serviceName}: ${message}`,
      ErrorCode.SERVICE_UNAVAILABLE,
      503,
      { serviceName }
    );
  }
}

/**
 * Check if error is an AppError
 */
export function isAppError(error: any): error is AppError {
  return error instanceof AppError;
}

/**
 * Convert unknown error to AppError
 */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(
      error.message,
      ErrorCode.INTERNAL_SERVER_ERROR,
      500,
      { originalError: error.message },
      false
    );
  }

  return new AppError(
    'An unknown error occurred',
    ErrorCode.INTERNAL_SERVER_ERROR,
    500,
    { originalError: String(error) },
    false
  );
}

