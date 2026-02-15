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
import { telemetryEmitter } from '../../services/telemetryService';

const app = express();
app.use(express.json());
app.use('/mobile', mobileRoutes);

let mongo: MongoMemoryServer;
let token: string;
let user: Awaited<ReturnType<typeof User.create>>;

const authHeader = () => ({ Authorization: `Bearer ${token}` });

beforeAll(async () => {
  process.env.JWT_SECRET = 'testsecret';
  mongo = await MongoMemoryServer.create({ binary: { version: '7.0.5' } });
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
  telemetryEmitter.removeAllListeners();
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

describe('mobile offline queue backoff and telemetry', () => {
  it('applies exponential backoff on failure and emits telemetry', async () => {
    const created = await request(app)
      .post('/mobile/v1/offline-queue')
      .set(authHeader())
      .send({ type: 'sync-wo', payload: { ref: 'WO-4' } })
      .expect(201);

    const actionId = created.body.data.id as string;
    const etag = created.body.data.etag as string;

    const telemetryPromise = new Promise((resolve) => {
      telemetryEmitter.once('mobile.offlineAction.failed', resolve);
    });

    const failureRes = await request(app)
      .post(`/mobile/v1/offline-queue/${actionId}/fail`)
      .set({ ...authHeader(), 'If-Match': etag })
      .send({ message: 'network unavailable' })
      .expect(200);

    expect(failureRes.body.data.attempts).toBe(1);
    expect(failureRes.body.data.status).toBe('retrying');
    expect(failureRes.body.data.backoffSeconds).toBeGreaterThanOrEqual(5);
    expect(new Date(failureRes.body.data.nextAttemptAt).getTime()).toBeGreaterThan(Date.now());

    const telemetryEvent: any = await telemetryPromise;
    expect(telemetryEvent.event).toBe('mobile.offlineAction.failed');
    expect(telemetryEvent.actionId).toBe(actionId);
    expect(telemetryEvent.attempts).toBe(1);
  });

  it('marks an offline action as failed after exhausting retries', async () => {
    const created = await request(app)
      .post('/mobile/v1/offline-queue')
      .set(authHeader())
      .send({ type: 'sync-wo', payload: { ref: 'WO-5' } })
      .expect(201);

    const actionId = created.body.data.id as string;
    let etag = created.body.data.etag as string;

    let latest = created;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const res = await request(app)
        .post(`/mobile/v1/offline-queue/${actionId}/fail`)
        .set({ ...authHeader(), 'If-Match': etag })
        .send({ message: 'still failing' })
        .expect(200);

      latest = res;
      etag = res.headers.etag as string;
    }

    expect(latest.body.data.status).toBe('failed');
    expect(latest.body.data.backoffSeconds).toBeUndefined();
    expect(latest.body.data.nextAttemptAt).toBeUndefined();
    expect(latest.body.data.attempts).toBeGreaterThanOrEqual(5);
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
