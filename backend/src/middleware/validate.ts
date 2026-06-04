/**
 * Zod Validation Middleware
 * =========================
 * Centralized request validation using Zod schemas.
 * Validates body, query, and params.
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodType, ZodTypeDef } from 'zod';
import { ValidationError } from '../lib/errors.js';

/**
 * Creates a validation middleware for request body
 */
export function validateBody<T>(schema: ZodType<T, ZodTypeDef, unknown>) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const result = await schema.parseAsync(req.body);
      req.body = result;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors: Record<string, string[]> = {};
        
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          if (!formattedErrors[path]) {
            formattedErrors[path] = [];
          }
          formattedErrors[path]!.push(err.message);
        });

        next(new ValidationError('Validation failed', formattedErrors));
      } else {
        next(error);
      }
    }
  };
}

/**
 * Creates a validation middleware for query parameters
 */
export function validateQuery<T>(schema: ZodType<T, ZodTypeDef, unknown>) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const result = await schema.parseAsync(req.query);
      // In Express 5, req.query is read-only, so we store validated query in a custom property
      (req as any).validatedQuery = result;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors: Record<string, string[]> = {};
        
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          if (!formattedErrors[path]) {
            formattedErrors[path] = [];
          }
          formattedErrors[path]!.push(err.message);
        });

        next(new ValidationError('Invalid query parameters', formattedErrors));
      } else {
        next(error);
      }
    }
  };
}

/**
 * Creates a validation middleware for route params
 */
export function validateParams<T>(schema: ZodType<T, ZodTypeDef, unknown>) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const result = await schema.parseAsync(req.params);
      req.params = result as typeof req.params;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors: Record<string, string[]> = {};
        
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          if (!formattedErrors[path]) {
            formattedErrors[path] = [];
          }
          formattedErrors[path]!.push(err.message);
        });

        next(new ValidationError('Invalid route parameters', formattedErrors));
      } else {
        next(error);
      }
    }
  };
}
