/**
 * Centralized Error Handling Middleware
 * =====================================
 * Catches all errors and returns consistent JSON responses.
 */

import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '../lib/errors.js';
import { isDev } from '../config/index.js';

interface ErrorResponse {
  success: false;
  message: string;
  code?: string;
  errors?: Record<string, string[]>;
  stack?: string;
}

/**
 * Global error handler
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // Default error values
  let statusCode = 500;
  let message = 'Internal server error';
  let code = 'INTERNAL_ERROR';
  let errors: Record<string, string[]> | undefined;

  // Handle known operational errors
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code || 'ERROR';

    // Include validation errors if present
    if (err instanceof ValidationError) {
      errors = err.errors;
    }
  }

  // Log error (in production, use a proper logger)
  console.error(`[ERROR] ${statusCode} - ${message}`);
  if (isDev) {
    console.error(err.stack);
  }

  // Build response
  const response: ErrorResponse = {
    success: false,
    message,
    code,
  };

  // Include validation errors if present
  if (errors) {
    response.errors = errors;
  }

  // Include stack trace in development
  if (isDev && err.stack) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

/**
 * 404 handler for undefined routes
 */
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
    code: 'NOT_FOUND',
  });
}

/**
 * Async handler wrapper
 * Catches async errors and passes to error middleware
 */
export function asyncHandler<T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
