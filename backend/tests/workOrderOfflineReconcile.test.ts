/*
 * SPDX-License-Identifier: MIT
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import WorkOrder from '../models/WorkOrder';
import workOrdersModuleRouter from '../src/modules/work-orders';

const app = express();
app.use(express.json());
app.use('/api/work-orders', workOrdersModuleRouter);

let mongo: MongoMemoryServer;
let token: string;
let user: Awaited<ReturnType<typeof User.create>>;

beforeAll(async () => {
  process.env.JWT_SECRET = 'testsecret';
  mongo = await MongoMemoryServer.create();
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
    name: 'Offline Tester',
    email: 'offline@example.com',
    passwordHash: 'pass123',
    roles: ['admin'],
    tenantId: new mongoose.Types.ObjectId(),
    employeeId: 'EMP-OFF',
  });
  token = jwt.sign(
    { id: user._id.toString(), roles: user.roles, tenantId: user.tenantId.toString() },
    process.env.JWT_SECRET!,
  );
});

describe('work order offline reconcile', () => {
  it('applies reconcile updates when the client timestamp is current', async () => {
    const workOrder = await WorkOrder.create({
      title: 'WO Offline',
      tenantId: user.tenantId,
      status: 'requested',
      priority: 'medium',
    });

    const res = await request(app)
      .put(`/api/work-orders/${workOrder._id}/reconcile`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        status: 'assigned',
        clientUpdatedAt: new Date(Date.now() + 1000).toISOString(),
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('assigned');
  });

  it('returns conflicts when the server is newer than the offline timestamp', async () => {
    const workOrder = await WorkOrder.create({
      title: 'WO Conflict',
      tenantId: user.tenantId,
      status: 'requested',
      priority: 'medium',
    });

    workOrder.status = 'assigned';
    await workOrder.save();

    const res = await request(app)
      .put(`/api/work-orders/${workOrder._id}/reconcile`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        status: 'in_progress',
        clientUpdatedAt: new Date(Date.now() - 60_000).toISOString(),
      })
      .expect(409);

    expect(res.body.success).toBe(false);
    expect(res.body.data.conflicts).toContain('status');
  });
});
