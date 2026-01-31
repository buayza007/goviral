import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
  }
}

export class QuotaExceededError extends AppError {
  constructor(message: string = 'Search quota exceeded') {
    super(message, 429);
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('Error:', err);

  // Handle known operational errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.name,
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }

  // Handle Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    return res.status(400).json({
      error: 'Database Error',
      message: 'A database error occurred. Please try again.',
    });
  }

  // Handle Apify errors
  if (err.message?.includes('Apify') || err.message?.includes('actor')) {
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'Unable to fetch social media data at this time. Please try again later.',
    });
  }

  // Handle unknown errors
  return res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' 
      ? err.message 
      : 'An unexpected error occurred. Please try again later.',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}
