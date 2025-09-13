/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';

import SummaryRoutes from '../routes/SummaryRoutes';
import User from '../models/User';
import WorkOrder from '../models/WorkOrder';
import WorkHistory from '../models/WorkHistory';
import TimeSheet from '../models/TimeSheet';

const app = express();
app.use(express.json());
app.use('/api/summary', SummaryRoutes);

let mongo: MongoMemoryServer;
let token: string;
let tenantId: mongoose.Types.ObjectId;

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
    passwordHash: 'pass123',
    role: 'manager',
    tenantId: new mongoose.Types.ObjectId(),
  });
  tenantId = user.tenantId;
  token = jwt.sign({ id: user._id.toString(), role: user.role }, process.env.JWT_SECRET!);

  const now = new Date();
  const pmTaskId1 = new mongoose.Types.ObjectId();
  const pmTaskId2 = new mongoose.Types.ObjectId();

  await WorkOrder.create({
    title: 'PM done',
    tenantId,
    status: 'completed',
    pmTask: pmTaskId1,
  });
  await WorkOrder.create({
    title: 'PM open',
    tenantId,
    status: 'requested',
    pmTask: pmTaskId2,
  });
  await WorkOrder.create({
    title: 'CM open',
    tenantId,
    status: 'requested',
  });

  await WorkHistory.create({
    tenantId,
    timeSpentHours: 5,
    completedAt: now,
  });
  await WorkHistory.create({
    tenantId,
    timeSpentHours: 3,
    completedAt: now,
  });

  await TimeSheet.create({
    tenantId,
    date: now,
    totalHours: 20,
  });
});

describe('Summary KPIs', () => {
  it('returns calculated metrics', async () => {
    const res = await request(app)
      .get('/api/summary')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toMatchObject({
      data: {
        pmCompliance: 0.5,
        woBacklog: 2,
        downtimeThisMonth: 8,
        costMTD: 400,
        cmVsPmRatio: 0.5,
        wrenchTimePct: 40,
      },
      error: null,
    });
  });
});
