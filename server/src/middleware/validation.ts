/**
 * Input Validation Middleware
 * Validates request body, query, and params
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { ValidationError } from '../lib/errors.js';

/**
 * Validate request body
 */
export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          value: (error as any).input,
        }));
        next(new ValidationError('Invalid request body', { fields: details }));
      } else {
        next(error);
      }
    }
  };
}

/**
 * Validate request query parameters
 */
export function validateQuery<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          value: (error as any).input,
        }));
        next(new ValidationError('Invalid query parameters', { fields: details }));
      } else {
        next(error);
      }
    }
  };
}

/**
 * Validate request params
 */
export function validateParams<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          value: (error as any).input,
        }));
        next(new ValidationError('Invalid route parameters', { fields: details }));
      } else {
        next(error);
      }
    }
  };
}

/**
 * Common validation schemas
 */
export const commonSchemas = {
  userId: z.string().min(1, 'User ID is required'),
  productId: z.string().min(1, 'Product ID is required'),
  orderId: z.string().min(1, 'Order ID is required'),
  conversationId: z.string().min(1, 'Conversation ID is required'),
  sessionId: z.string().min(1, 'Session ID is required'),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : undefined)),
  offset: z.string().optional().transform((val) => (val ? parseInt(val, 10) : undefined)),
  email: z.string().email('Invalid email address'),
  positiveNumber: z.number().positive('Must be a positive number'),
  nonNegativeNumber: z.number().nonnegative('Must be a non-negative number'),
};

