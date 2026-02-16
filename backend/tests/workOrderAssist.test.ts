/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect, vi } from 'vitest';
import type { Mock } from 'vitest';

import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import WorkOrderRoutes from '../routes/workOrdersRoutes';
import WorkOrder from '../models/WorkOrder';
import { getWorkOrderAssistance } from '../services/aiCopilot';
import Site from '../models/Site';

vi.mock('../services/aiCopilot');

const app = express();
app.use(express.json());
app.use('/api/workorders', WorkOrderRoutes);

let mongo: MongoMemoryServer;
let token: string;
let user: Awaited<ReturnType<typeof User.create>>;
let workOrder: Awaited<ReturnType<typeof WorkOrder.create>>;
let siteId: mongoose.Types.ObjectId;

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
  user = await User.create({
    name: 'Tester',
    email: 'tester@example.com',
    passwordHash: 'pass123',
    roles: ['admin'],
    tenantId: new mongoose.Types.ObjectId(),
    employeeId: 'WOA-EMP-001',
  });
  token = jwt.sign(
    { id: user._id.toString(), roles: user.roles, tenantId: user.tenantId.toString() },
    process.env.JWT_SECRET!,
  );
  const site = await Site.create({ tenantId: user.tenantId, name: 'Main Site' });
  siteId = site._id;
  workOrder = await WorkOrder.create({
    title: 'WO',
    tenantId: user.tenantId,
    plant: siteId,
    siteId,
  });
});

describe('GET /api/workorders/:id/assist', () => {
  it('returns AI summary and risk score', async () => {
    (getWorkOrderAssistance as unknown as Mock).mockResolvedValue({
      summary: 'ok',
      riskScore: 0.2,
    });

    const res = await request(app)
      .get(`/api/workorders/${workOrder._id}/assist`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-site-id', siteId.toString())
      .expect(200);

    const payload = res.body.data ?? res.body;
    expect(payload.summary).toBe('ok');
    expect(payload.riskScore).toBe(0.2);
  });
});
