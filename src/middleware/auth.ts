import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
export { Role } from '@prisma/client';

// Types for the request user payload
export interface AuthPayload {
  userId: number;
  role: Role;
}

export const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'; // in prod set env var
const JWT_EXPIRES_IN = '8h'; // short lived – simple internal tool

/** Middleware to verify JWT and attach user info */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  if (!token) {
    return res.status(401).json({ error: 'Missing authentication token' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload & Partial<AuthPayload>;
    if (typeof decoded.userId !== 'number' || !Object.values(Role).includes(decoded.role as Role)) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    req.user = { userId: decoded.userId, role: decoded.role as Role };
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/** Higher‑order middleware that enforces role */
export const requireRole = (...allowed: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      // should never happen because requireAuth runs first
      return res.status(401).json({ error: 'Unauthenticated' });
    }
    if (!allowed.includes(req.user.role as Role)) {
      return res.status(403).json({ error: `Forbidden – requires one of: ${allowed.join(', ')}` });
    }
    next();
  };
};

/** Helper to sign JWT – used in login */
export const signJwt = (payload: AuthPayload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};
