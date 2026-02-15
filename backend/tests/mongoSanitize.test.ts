import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

let app: Express;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'testsecret';
  process.env.MONGO_URI = 'mongodb://localhost:27017/test';
  process.env.CORS_ORIGIN = 'http://localhost';
  app = (await import('../server')).default;
});

describe('mongoSanitize middleware', () => {
  it('sanitizes keys in the body', async () => {
    const res = await request(app)
      .post('/test/sanitize')
      .send({ username: { $gt: '' }, 'profile.name': 'bob' });
    expect(res.body).toEqual({ username: { _gt: '' }, profile_name: 'bob' });
  });

  it('sanitizes keys in the query', async () => {
    const res = await request(app)
      .get('/test/sanitize')
      .query({ 'user.name': 'alice', age: { $ne: 30 } });
    expect(res.body).toEqual({ user_name: 'alice', age: { _ne: '30' } });
  });
});
