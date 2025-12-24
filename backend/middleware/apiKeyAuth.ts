/*
 * SPDX-License-Identifier: MIT
 */

import type { RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';

import ApiKey, { type ApiKeyDocument } from '../models/ApiKey';
import { hashApiKey } from '../utils/apiKeys';

declare module 'express-serve-static-core' {
  interface Request {
    apiKey?: ApiKeyDocument;
  }
}

const timingSafeEqual = (a: string, b: string): boolean => {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
};

const getApiKeyValue = (req: Parameters<RequestHandler>[0]): string | undefined => {
  const headerValue = req.headers['x-api-key'] ?? req.headers['x-api-token'];
  if (typeof headerValue === 'string' && headerValue.trim()) {
    return headerValue.trim();
  }
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('apikey ')) {
    return authHeader.slice('apikey '.length).trim();
  }
  if (typeof req.query['api_key'] === 'string') {
    return req.query['api_key'];
  }
  return undefined;
};

export const requireApiKey: RequestHandler = async (req, res, next) => {
  try {
    const candidate = getApiKeyValue(req);
    if (!candidate) {
      res.status(401).json({ message: 'API key is required' });
      return;
    }
    const candidateHash = hashApiKey(candidate);
    const key = await ApiKey.findOne({ keyHash: candidateHash }).select('+keyHash');
    if (!key || !timingSafeEqual(key.keyHash, candidateHash)) {
      res.status(401).json({ message: 'Invalid API key' });
      return;
    }
    if (key.revokedAt) {
      res.status(401).json({ message: 'API key revoked' });
      return;
    }
    key.lastUsedAt = new Date();
    await key.save();
    req.apiKey = key;
    (req as any).tenantId = key.tenantId?.toString();
    next();
  } catch (err) {
    next(err);
  }
};

const windowMs = parseInt(process.env.API_KEY_RATE_LIMIT_WINDOW_MS ?? '60000', 10);
const defaultMax = parseInt(process.env.API_KEY_RATE_LIMIT_MAX ?? '120', 10);

export const apiKeyRateLimiter = rateLimit({
  windowMs,
  max: (req) => req.apiKey?.rateLimitMax ?? defaultMax,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.apiKey?._id?.toString() ?? req.ip ?? 'anonymous',
});

export const apiKeyAuthMiddleware: RequestHandler[] = [requireApiKey, apiKeyRateLimiter];
