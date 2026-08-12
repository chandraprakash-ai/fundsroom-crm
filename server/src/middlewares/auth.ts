import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend Express Request to include authenticated user details
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
  };
}

// 1. Token Verification Middleware
export const authenticateJWT = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ status: 'error', message: 'Access token is missing or invalid' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const jwtSecret = process.env.JWT_SECRET || 'fallback-secret';

  try {
    const decoded = jwt.verify(token, jwtSecret) as { id: string; username: string; role: string };
    req.user = decoded; // Attach user payload to the request
    next();
  } catch (error) {
    res.status(401).json({ status: 'error', message: 'Token is expired or invalid' });
    return;
  }
};

// 2. Role-Based Access Control Middleware (RBAC)
export const authorizeRoles = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        status: 'error',
        message: `Forbidden: Access restricted to roles: [${allowedRoles.join(', ')}]`
      });
      return;
    }

    next();
  };
};

