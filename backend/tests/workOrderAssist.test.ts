/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import WorkOrderRoutes from '../routes/WorkOrderRoutes';
import WorkOrder from '../models/WorkOrder';
import { getWorkOrderAssistance } from '../services/aiCopilot';

vi.mock('../services/aiCopilot');

const app = express();
app.use(express.json());
app.use('/api/workorders', WorkOrderRoutes);

let mongo: MongoMemoryServer;
let token: string;
let user: Awaited<ReturnType<typeof User.create>>;
let workOrder: Awaited<ReturnType<typeof WorkOrder.create>>;

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
    role: 'manager',
    tenantId: new mongoose.Types.ObjectId(),
  });
  token = jwt.sign({ id: user._id.toString(), role: user.role }, process.env.JWT_SECRET!);
  workOrder = await WorkOrder.create({
    title: 'WO',
    tenantId: user.tenantId,
  });
});

describe('GET /api/workorders/:id/assist', () => {
  it('returns AI summary and risk score', async () => {
    (getWorkOrderAssistance as unknown as vi.Mock).mockResolvedValue({
      summary: 'ok',
      riskScore: 0.2,
    });

    const res = await request(app)
      .get(`/api/workorders/${workOrder._id}/assist`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.summary).toBe('ok');
    expect(res.body.riskScore).toBe(0.2);
  });
});
