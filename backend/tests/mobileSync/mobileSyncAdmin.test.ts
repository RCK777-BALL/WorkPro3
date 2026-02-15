/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import mobileSyncAdminRoutes from '../../routes/mobileSyncAdmin';
import MobileSyncConflict from '../../models/MobileSyncConflict';
import MobileDeviceTelemetry from '../../models/MobileDeviceTelemetry';
import MobileOfflineAction from '../../models/MobileOfflineAction';
import AuditLog from '../../models/AuditLog';
import User from '../../models/User';

const app = express();
app.use(express.json());
app.use('/mobile', mobileSyncAdminRoutes);

let mongo: MongoMemoryServer;
let token: string;
let tenantId: mongoose.Types.ObjectId;
let userId: mongoose.Types.ObjectId;

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
  tenantId = new mongoose.Types.ObjectId();
  userId = new mongoose.Types.ObjectId();
  await User.create({
    _id: userId,
    name: 'Admin',
    email: 'admin@example.com',
    passwordHash: 'hash',
    roles: ['admin'],
    tenantId,
    employeeId: 'EMP-MOBILE-ADMIN',
  });
  token = jwt.sign(
    {
      id: userId.toString(),
      tenantId: tenantId.toString(),
      roles: ['admin'],
      scopes: ['mobile:access'],
    },
    process.env.JWT_SECRET!,
  );
});

describe('mobile sync admin routes', () => {
  it('surfaces pending queues', async () => {
    await MobileOfflineAction.create({
      tenantId,
      userId,
      entityType: 'WorkOrder',
      operation: 'update',
      type: 'wo',
      payload: { ref: 'WO-1', deviceId: 'device-1' },
      status: 'pending',
    });

    const res = await request(app)
      .get('/mobile/admin/sync/pending')
      .set(authHeader())
      .expect(200);

    expect(res.body.data.length).toBe(1);
  });

  it('records conflicts and allows resolution with audit logs', async () => {
    const created = await request(app)
      .post('/mobile/admin/sync/conflicts')
      .set({ ...authHeader(), 'x-device-id': 'device-123' })
      .send({ deviceId: 'device-123', entityType: 'WorkOrder', entityId: 'abc123', clientVersion: 1, serverVersion: 2 })
      .expect(201);

    const conflictId = created.body.data._id;

    const resolveRes = await request(app)
      .post(`/mobile/admin/sync/conflicts/${conflictId}/resolve`)
      .set(authHeader())
      .send({ resolution: 'server', notes: 'admin override' })
      .expect(200);

    expect(resolveRes.body.data.status).toBe('resolved');

    const auditCount = await AuditLog.countDocuments({ entityType: 'MobileSyncConflict' });
    expect(auditCount).toBe(2); // creation + resolution
  });

  it('persists telemetry per device', async () => {
    await request(app)
      .post('/mobile/admin/sync/conflicts')
      .set({ ...authHeader(), 'x-device-id': 'device-xyz', 'x-device-platform': 'ios', 'x-app-version': '1.2.3' })
      .send({ deviceId: 'device-xyz', entityType: 'Asset' })
      .expect(201);

    const telemetry = await request(app)
      .get('/mobile/admin/sync/telemetry')
      .set(authHeader())
      .expect(200);

    expect(telemetry.body.data[0].deviceId).toBe('device-xyz');
    const record = await MobileDeviceTelemetry.findOne({ deviceId: 'device-xyz', tenantId });
    expect(record?.totalConflicts).toBeGreaterThanOrEqual(1);
  });
});
