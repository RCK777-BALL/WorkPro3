import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { cache } from '../middleware/cache';

// In-memory mock for Redis with TTL support
const store = new Map<string, { value: string; expireAt: number }>();

const redisMock = {
  get: vi.fn(async (key: string) => {
    const entry = store.get(key);
    if (!entry) return null;
    if (entry.expireAt < Date.now()) {
      store.delete(key);
      return null;
    }
    return entry.value;
  }),
  set: vi.fn(async (key: string, value: string, _mode: string, ttl: number) => {
    store.set(key, { value, expireAt: Date.now() + ttl * 1000 });
  }),
};

vi.mock('../utils/redisClient', () => ({ default: redisMock }));

describe('cache middleware', () => {
  beforeEach(() => {
    store.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('serves cached responses and respects TTL', async () => {
    const app = express();
    app.get('/data', cache('test', 1), (_req, res) => {
      res.json({ time: Date.now() });
    });

    const first = await request(app).get('/data');
    const firstTime = first.body.time;
    expect(first.headers['x-cache']).toBeUndefined();

    const second = await request(app).get('/data');
    expect(second.headers['x-cache']).toBe('HIT');
    expect(second.body.time).toBe(firstTime);

    // advance past TTL to expire cache
    vi.advanceTimersByTime(1100);

    const third = await request(app).get('/data');
    expect(third.headers['x-cache']).toBeUndefined();
    expect(third.body.time).not.toBe(firstTime);
  });
});
