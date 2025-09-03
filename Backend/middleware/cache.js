import redis from '../utils/redisClient';
/**
 * Cache middleware using Redis. Cached responses are stored using the
 * request URL prefixed with the provided key. Set `ttl` to control the
 * expiration time in seconds.
 */
export const cache = (keyPrefix, ttl = 60) => {
    return async (req, res, next) => {
        const key = `${keyPrefix}:${req.originalUrl}`;
        try {
            const cached = await redis.get(key);
            if (cached) {
                res.setHeader('X-Cache', 'HIT');
                res.json(JSON.parse(cached));
                return;
            }
            const originalJson = res.json.bind(res);
            res.json = (body) => {
                redis
                    .set(key, JSON.stringify(body), 'EX', ttl)
                    .catch((err) => console.error('Redis set error:', err));
                return originalJson(body);
            };
        }
        catch (err) {
            console.error('Redis error:', err);
        }
        next();
    };
};
export default cache;
