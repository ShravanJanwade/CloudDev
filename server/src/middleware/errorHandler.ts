import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  errors?: any;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log error details
  console.error(`[Error] ${err.statusCode || 500} - ${err.message}`);
  if (err.stack && process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? 'Internal Server Error' : err.message;

  res.status(statusCode).json({
    error: message,
    code: err.code,
    validationErrors: err.errors,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// Helper to create errors
export class APIError extends Error implements AppError {
  statusCode: number;
  code?: string;
  errors?: any;

  constructor(message: string, statusCode: number = 500, code?: string, errors?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
    Object.setPrototypeOf(this, APIError.prototype);
  }
}
