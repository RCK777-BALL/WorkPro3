import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../utils/getJwtSecret';

export interface AuthPayload {
  id: string;
  email: string;
  tenantId?: string;
  tokenVersion?: number;
}

/**
 * Require a valid JWT to access the route.
 * Reads token from:
 *  - Authorization: Bearer <token>
 *  - cookies.token (requires cookie-parser)
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const bearer = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : undefined;

  // If you use cookie-parser in server.ts, req.cookies will be populated
  const cookieToken = (req as any).cookies?.token as string | undefined;

  const token = bearer ?? cookieToken;
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  let secret: string;
  try {
    secret = getJwtSecret();
  } catch {
    return res.status(500).json({ message: 'Server configuration issue' });
  }

  try {
    const payload = jwt.verify(token, secret) as AuthPayload;
    (req as any).user = payload; // see optional typing below
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}
