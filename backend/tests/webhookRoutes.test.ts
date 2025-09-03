import { describe, it, beforeAll, expect } from "vitest";
import request from 'supertest';
import express from 'express';

import webhookRoutes from '../routes/WebhookRoutes';

const app = express();
app.use(express.json());
app.use('/api/hooks', webhookRoutes);

beforeAll(() => {
  process.env.THIRD_PARTY_API_KEYS = 'testkey';
  process.env.THIRD_PARTY_OAUTH_SECRET = 'secret';
});

describe('Webhook Routes', () => {
  it('rejects unauthorized requests', async () => {
    await request(app)
      .post('/api/hooks/workorder')
      .send({ event: 'test' })
      .expect(401);
  });

  it('accepts valid API key', async () => {
    await request(app)
      .post('/api/hooks/workorder')
      .set('x-api-key', 'testkey')
      .send({ event: 'test' })
      .expect(200);
  });
});
