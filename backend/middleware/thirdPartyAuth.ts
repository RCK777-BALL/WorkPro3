import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/**
 * Authenticate third-party requests using either an API key or an OAuth2 bearer token.
 * API keys are provided via the `x-api-key` header. OAuth2 tokens use the
 * `Authorization: Bearer <token>` header and are verified using the
 * `THIRD_PARTY_OAUTH_SECRET` env variable (falls back to `JWT_SECRET`).
 */
export const requireThirdPartyAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const apiKeyHeader = req.headers['x-api-key'] as string | undefined;
  const authHeader = req.headers['authorization'];

  const validKeys = (process.env.THIRD_PARTY_API_KEYS || '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);

  if (apiKeyHeader && validKeys.includes(apiKeyHeader)) {
    req.thirdParty = { type: 'api-key', key: apiKeyHeader };
    return void next();
  }

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const secret = process.env.THIRD_PARTY_OAUTH_SECRET || process.env.JWT_SECRET;
      const payload = jwt.verify(token, secret!);
      req.thirdParty = { type: 'oauth2', payload };
      return void next();
    } catch {
      return void res.status(401).json({ message: 'Invalid token' });
    }
  }

  res.status(401).json({ message: 'Unauthorized' });
};

export default requireThirdPartyAuth;
