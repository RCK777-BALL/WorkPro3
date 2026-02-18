/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { apiKeyAuthMiddleware } from '../middleware/apiKeyAuth';
import ApiKey from '../models/ApiKey';
import { generateApiKey } from '../utils/apiKeys';

const app = express();
app.use(express.json());
app.get('/protected', apiKeyAuthMiddleware, (_req, res) => {
  res.json({ ok: true });
});

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create({ binary: { version: '7.0.5' } });
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await mongoose.connection.db?.dropDatabase();
});

describe('API key auth middleware', () => {
  it('enforces API key rate limits', async () => {
    const generated = generateApiKey();
    await ApiKey.create({
      name: 'Test Key',
      keyHash: generated.keyHash,
      prefix: generated.prefix,
      tenantId: new mongoose.Types.ObjectId(),
      rateLimitMax: 2,
    });

    await request(app).get('/protected').set('x-api-key', generated.key).expect(200);
    await request(app).get('/protected').set('x-api-key', generated.key).expect(200);
    await request(app).get('/protected').set('x-api-key', generated.key).expect(429);
  });
});
