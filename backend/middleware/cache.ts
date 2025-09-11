/*
 * SPDX-License-Identifier: MIT
 */

import type { Request, Response, NextFunction } from 'express';
import redis from '../utils/redisClient';

/**
 * Cache middleware using Redis. Cached responses are stored using the
 * request URL prefixed with the provided key. Set `ttl` to control the
 * expiration time in seconds.
 */
export const cache = (keyPrefix: string, ttl = 60) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const key = `${keyPrefix}:${req.originalUrl}`;
    try {
      const cached = await redis.get(key);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        res.json(JSON.parse(cached));
        return;
      }

      const originalSend = res.send.bind(res);
      const sendResponse: typeof res.send = (body) => {
        redis
          .set(key, JSON.stringify(body), 'EX', ttl)
          .catch((err: unknown) => console.error('Redis set error:', err));
        return originalSend(body);
      };
      res.send = sendResponse;
    } catch (err) {
      console.error('Redis error:', err);
    }
    next();
  };
};

export default cache;
