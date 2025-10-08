import express from 'express';
import request from 'supertest';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { cache } from '../middleware/cache';
import redis from '../utils/redisClient';
import logger from '../utils/logger';

vi.mock('../utils/redisClient', () => ({
  default: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock('../utils/logger', () => ({
  default: {
    error: vi.fn(),
  },
}));

const mockedRedis = redis as unknown as {
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
};

const mockedLogger = logger as unknown as {
  error: ReturnType<typeof vi.fn>;
};

describe('cache middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns cached response when available', async () => {
    const app = express();
    const cached = { message: 'cached' };
    mockedRedis.get.mockResolvedValueOnce(JSON.stringify(cached));

    const handler = vi.fn((_req, res) => res.json({ message: 'fresh' }));

    app.get('/test', cache('test'), handler);

    const res = await request(app).get('/test');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(cached);
    expect(res.headers['x-cache']).toBe('HIT');
    expect(handler).not.toHaveBeenCalled();
    expect(mockedRedis.set).not.toHaveBeenCalled();
  });

  it('logs error and continues when redis.get fails', async () => {
    const app = express();
    mockedRedis.get.mockRejectedValueOnce(new Error('fail'));

    const handler = vi.fn((_req, res) => res.json({ message: 'fresh' }));

    app.get('/test', cache('test'), handler);

    const res = await request(app).get('/test');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'fresh' });
    expect(mockedLogger.error).toHaveBeenCalledWith('Redis error:', expect.any(Error));
  });

  it('logs set errors but still returns response', async () => {
    const app = express();
    mockedRedis.get.mockResolvedValueOnce(null);
    mockedRedis.set.mockRejectedValueOnce(new Error('set fail'));

    app.get('/test', cache('test'), (_req, res) => res.json({ message: 'fresh' }));

    const res = await request(app).get('/test');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'fresh' });
    expect(mockedLogger.error).toHaveBeenCalledWith('Redis set error:', expect.any(Error));
  });
});

