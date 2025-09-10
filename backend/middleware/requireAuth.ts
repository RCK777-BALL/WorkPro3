import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../utils/getJwtSecret';
import type { AuthedRequestHandler } from '../types/http';

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
export const requireAuth: AuthedRequestHandler = (req, res, next) => {
  const bearer = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : undefined;

  const cookieToken = (req as any).cookies?.token as string | undefined;

  const token = bearer ?? cookieToken;
  if (!token) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  let secret: string;
  try {
    secret = getJwtSecret();
  } catch {
    res.status(500).json({ message: 'Server configuration issue' });
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as AuthPayload;
    (req as any).user = payload;
    next();
    return;
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
    return;
  }
};
