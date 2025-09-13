/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import publicRequestRoutes from '../routes/publicRequestRoutes';

const app = express();
app.use(express.json());
app.use('/api/public', publicRequestRoutes);

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await mongoose.connection.db?.dropDatabase();
});

describe('Public work requests', () => {
  it('creates a work request without auth and returns code', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const res = await request(app)
      .post('/api/public/request-work')
      .send({ description: 'Need help', contact: 'user@example.com' })
      .expect(201);
    expect(res.body.code).toBeDefined();
    expect(typeof res.body.code).toBe('string');
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('retrieves status by code', async () => {
    const {
      body: { code },
    } = await request(app)
      .post('/api/public/request-work')
      .send({ description: 'Need help', contact: 'user@example.com' })
      .expect(201);
    const getRes = await request(app)
      .get(`/api/public/request-work/${code}`)
      .expect(200);
    expect(getRes.body.status).toBe('new');
  });
});
