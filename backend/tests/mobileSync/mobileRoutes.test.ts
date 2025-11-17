/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import mobileRoutes from '../../routes/mobileRoutes';
import User from '../../models/User';
import MobileOfflineAction from '../../models/MobileOfflineAction';
import AuditLog from '../../models/AuditLog';
import WorkOrder from '../../models/WorkOrder';

const app = express();
app.use(express.json());
app.use('/mobile', mobileRoutes);

let mongo: MongoMemoryServer;
let token: string;
let user: Awaited<ReturnType<typeof User.create>>;

const authHeader = () => ({ Authorization: `Bearer ${token}` });

beforeAll(async () => {
  process.env.JWT_SECRET = 'testsecret';
  mongo = await MongoMemoryServer.create({ binary: { version: '7.0.14' } });
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) {
    await mongo.stop();
  }
});

beforeEach(async () => {
  await mongoose.connection.db?.dropDatabase();
  user = await User.create({
    name: 'Mobile User',
    email: 'mobile@example.com',
    passwordHash: 'pass123',
    roles: ['technician'],
    tenantId: new mongoose.Types.ObjectId(),
    employeeId: 'TECH-1',
  });
  token = jwt.sign(
    {
      id: user._id.toString(),
      tenantId: user.tenantId.toString(),
      scopes: ['mobile:access'],
    },
    process.env.JWT_SECRET!,
  );
});

describe('mobile routes offline queue versioning', () => {
  it('creates offline actions with version metadata and audit logs', async () => {
    const response = await request(app)
      .post('/mobile/v1/offline-queue')
      .set(authHeader())
      .send({ type: 'sync-wo', payload: { ref: 'WO-1' } })
      .expect(201);

    const { data } = response.body;
    expect(data.version).toBe(1);
    expect(data.etag).toBeDefined();
    expect(response.headers['x-resource-version']).toBe('1');

    const action = await MobileOfflineAction.findById(data.id).lean();
    expect(action?.etag).toBeDefined();

    const auditCount = await AuditLog.countDocuments({ entityType: 'MobileOfflineAction' });
    expect(auditCount).toBe(1);
  });

  it('returns 304 when offline queue is unchanged using ETag', async () => {
    await request(app)
      .post('/mobile/v1/offline-queue')
      .set(authHeader())
      .send({ type: 'sync-wo', payload: { ref: 'WO-2' } })
      .expect(201);

    const initial = await request(app).get('/mobile/v1/offline-queue').set(authHeader()).expect(200);
    const etag = initial.headers.etag as string;
    expect(etag).toBeDefined();

    await request(app)
      .get('/mobile/v1/offline-queue')
      .set({ ...authHeader(), 'If-None-Match': etag })
      .expect(304);
  });

  it('enforces If-Match and bumps version on completion', async () => {
    const created = await request(app)
      .post('/mobile/v1/offline-queue')
      .set(authHeader())
      .send({ type: 'sync-wo', payload: { ref: 'WO-3' } })
      .expect(201);

    const actionId = created.body.data.id;
    const etag = created.body.data.etag as string;

    const completeRes = await request(app)
      .post(`/mobile/v1/offline-queue/${actionId}/complete`)
      .set({ ...authHeader(), 'If-Match': etag })
      .expect(200);

    expect(completeRes.body.data.version).toBeGreaterThan(1);
    expect(completeRes.headers['x-resource-version']).toBe(String(completeRes.body.data.version));

    await request(app)
      .post(`/mobile/v1/offline-queue/${actionId}/complete`)
      .set({ ...authHeader(), 'If-Match': etag })
      .expect(412);
  });
});

describe('mobile work order listings expose version headers', () => {
  it('returns work orders with version metadata and list etag', async () => {
    await WorkOrder.create({
      title: 'WO Mobile',
      tenantId: user.tenantId,
      status: 'requested',
      priority: 'medium',
      type: 'corrective',
      checklists: [],
      partsUsed: [],
      signatures: [],
      permits: [],
      requiredPermitTypes: [],
      assignees: [],
    });

    const res = await request(app).get('/mobile/v1/work-orders').set(authHeader()).expect(200);
    expect(res.headers.etag).toBeDefined();
    expect(res.body.data.items[0].etag).toBeDefined();
    expect(res.body.data.items[0].version).toBeGreaterThanOrEqual(1);
  });
});
