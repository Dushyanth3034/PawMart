export class AppError extends Error {
  constructor(arg1, arg2, errors = null) {
    let statusCode, message;
    if (typeof arg1 === 'number') {
      statusCode = arg1;
      message = arg2;
    } else if (typeof arg2 === 'number') {
      statusCode = arg2;
      message = arg1;
    } else {
      statusCode = parseInt(arg1, 10) || parseInt(arg2, 10) || 500;
      message = typeof arg1 === 'string' ? arg1 : (typeof arg2 === 'string' ? arg2 : 'Something went wrong');
    }
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorMiddleware(err, req, res, next) {
  // Always log the actual stack trace in console for development/monitoring
  console.error(`[Error] ${req.method} ${req.path}`);
  console.error(err);

  // 1. Zod Validation Errors
  if (err.name === 'ZodError') {
    const cleanMsg = err.errors[0]?.message || 'Please fill out all fields correctly.';
    return res.status(400).json({
      success: false,
      message: cleanMsg
    });
  }

  // 2. Prisma Database Errors
  if (err.code === 'P2002') {
    const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : (err.meta?.target || '');
    if (target.includes('email')) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists.'
      });
    }
    return res.status(400).json({
      success: false,
      message: `A record with duplicate ${target || 'unique key'} already exists.`
    });
  }

  // General Prisma or Postgresql DB Errors
  if (err.code && err.code.startsWith('P') || err.message?.toLowerCase().includes('prisma') || err.message?.toLowerCase().includes('postgres')) {
    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again.'
    });
  }

  // 3. JWT Authentication Errors
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Your session has expired. Please log in again.'
    });
  }
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid session token. Please log in again.'
    });
  }

  // 4. Custom Application Errors
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Something went wrong. Please try again.';

  // If it's a 500 error, return a generic user-friendly message
  if (statusCode === 500) {
    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again.'
    });
  }

  return res.status(statusCode).json({
    success: false,
    message
  });
}
