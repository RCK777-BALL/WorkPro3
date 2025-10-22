/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import PartsRoutes from '../routes/PartsRoutes';
import AuditRoutes from '../routes/AuditRoutes';
import requestLog from '../middleware/requestLog';
import logger from '../utils/logger';

const app = express();
app.use(express.json());
app.use(requestLog);
app.use('/api/parts', PartsRoutes);
app.use('/api/audit', AuditRoutes);

let mongo: MongoMemoryServer;
let token: string;
let userId: string;
let tenantId: string;

beforeAll(async () => {
  process.env.JWT_SECRET = 'testsecret';
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await mongoose.connection.db?.dropDatabase();
  const user = await User.create({
    name: 'Tester',
    email: 'tester@example.com',
    password: 'pass',
    tenantId: new mongoose.Types.ObjectId(),
    tokenVersion: 0,
  });
  userId = user._id.toString();
  tenantId = user.tenantId.toString();
  token = jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET!);
});

describe('audit logging', () => {
  it('records create, update, delete actions', async () => {
    const createRes = await request(app)
      .post('/api/parts')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Bolt', onHand: 5 });
    expect(createRes.status).toBe(201);
    const id = createRes.body.id;

    const updateRes = await request(app)
      .put(`/api/parts/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Bolt2' });
    expect(updateRes.status).toBe(200);

    const deleteRes = await request(app)
      .delete(`/api/parts/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(deleteRes.status).toBe(204);

    const auditRes = await request(app)
      .get('/api/audit')
      .set('Authorization', `Bearer ${token}`);
    expect(auditRes.status).toBe(200);
    expect(auditRes.body).toHaveLength(3);
    const actions = auditRes.body.map((a: any) => a.action).sort();
    expect(actions).toEqual(['create', 'delete', 'update']);
    auditRes.body.forEach((log: any) => {
      expect(log.entityType).toBe('Part');
      expect(log.entityId).toBe(id);
    });
  });

  it('logs requests with method, path, status, duration, tenant and user', async () => {
    const spy = vi.spyOn(logger, 'info').mockImplementation(() => {});
    await request(app)
      .get('/api/audit')
      .set('Authorization', `Bearer ${token}`);
    const log = spy.mock.calls.find((c) => c[0].includes('GET /api/audit'))?.[0];
    expect(log).toBeDefined();
    expect(log).toMatch(/GET \/api\/audit 200/);
    expect(log).toMatch(new RegExp(`tenant=${tenantId}`));
    expect(log).toMatch(new RegExp(`user=${userId}`));
    expect(log).toMatch(/ms/);
    spy.mockRestore();
  });
});
