/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import PMTaskRoutes from '../routes/PMTaskRoutes';
import User from '../models/User';
import PMTask from '../models/PMTask';
import WorkOrder from '../models/WorkOrder';

const app = express();
app.use(express.json());
app.use('/api/pm', PMTaskRoutes);

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
  await mongo.stop();
});

beforeEach(async () => {
  await mongoose.connection.db?.dropDatabase();
  user = await User.create({
    name: 'Tester',
    email: 'tester@example.com',
    passwordHash: 'pass123',
    roles: ['manager'],
    tenantId: new mongoose.Types.ObjectId(),
  });
  token = jwt.sign({ id: user._id.toString(), roles: user.roles }, process.env.JWT_SECRET!);
});

describe('PM generation endpoint', () => {
  it('creates work orders for tasks due in next 7 days', async () => {
    await PMTask.create({
      title: 'Daily check',
      tenantId: user.tenantId,
      rule: { type: 'calendar', cron: '0 0 * * *' },
    });

    const res = await request(app)
      .post('/api/pm/generate')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.generated).toBe(1);
    expect(await WorkOrder.countDocuments()).toBe(1);
  });
});
