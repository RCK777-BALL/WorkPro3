import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

let app: Express;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'testsecret';
  process.env.MONGO_URI = 'mongodb://localhost:27017/test';
  process.env.CORS_ORIGIN = 'http://allowed.com,http://another.com';
  app = (await import('../server')).default;
});

describe('CORS configuration', () => {
  it('allows requests from whitelisted origins', async () => {
    const origin = 'http://allowed.com';
    const res = await request(app).get('/').set('Origin', origin);
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe(origin);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('rejects requests from non-whitelisted origins', async () => {
    const res = await request(app)
      .get('/')
      .set('Origin', 'http://forbidden.com');
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Not allowed by CORS');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
    expect(res.headers['access-control-allow-credentials']).toBeUndefined();
  });
});
