import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { AppError } from './error.middleware.js';
import { prisma } from '../services/prisma.service.js';

export async function protect(req, res, next) {
  try {
    let token = null;
    
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError(401, 'Not authenticated. Please log in.'));
    }

    const decoded = jwt.verify(token, config.jwtAccessSecret);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, role: true, isSuspended: true },
    });

    if (!user) {
      return next(new AppError(401, 'User belonging to this token no longer exists.'));
    }

    if (user.isSuspended) {
      return next(new AppError(403, 'Your account has been suspended. Please contact administrator support.'));
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new AppError(401, 'Access token expired. Please refresh.'));
    }
    return next(new AppError(401, 'Invalid token. Not authenticated.'));
  }
}

export function restrictTo(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new AppError(403, 'You do not have permission to perform this action.')
      );
    }
    next();
  };
}
