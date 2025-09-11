import type { Request, Response, NextFunction } from 'express';
import redis from '../utils/redisClient';
import logger from '../utils/logger';

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
        res.json(JSON.parse(cached) as unknown);
        return;
      }

      const originalJson: Response['json'] = res.json.bind(res);
      res.json = <T>(body: T): Response<T> => {
        redis
          .set(key, JSON.stringify(body), 'EX', ttl)
          .catch((err: unknown) => logger.error('Redis set error:', err));
        return originalJson(body);
      };
    } catch (err) {
      logger.error('Redis error:', err);
    }
    next();
  };
};

export default cache;
