/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import ReportsRoutes from '../routes/ReportsRoutes';
import User from '../models/User';

const app = express();
app.use(express.json());
app.use('/api/reports', ReportsRoutes);

let mongo: MongoMemoryServer;
let token: string;
let tenantId: mongoose.Types.ObjectId;
let base: Date;

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

  base = new Date('2023-01-15T00:00:00Z');
  const invId = new mongoose.Types.ObjectId();
  await mongoose.connection.collection('inventories').insertOne({
    _id: invId,
    name: 'Part',
    unitCost: 5,
    quantity: 1,
    tenantId,
    createdAt: base,
    updatedAt: base,
  });
  await mongoose.connection.collection('workhistories').insertOne({
    tenantId,
    timeSpentHours: 4,
    materialsUsed: [invId],
    completedAt: base,
  });
  await mongoose.connection.collection('timesheets').insertOne({
    tenantId,
    date: base,
    totalHours: 8,
  });
});

describe('Reports metrics', () => {
  it('aggregates cost data', async () => {
    const res = await request(app)
      .get('/api/reports/costs')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body).toHaveLength(1);
    const expectedPeriod = base.toISOString().slice(0, 7);
    expect(res.body[0].period).toBe(expectedPeriod);
    expect(res.body[0].laborCost).toBeCloseTo(400);
    expect(res.body[0].maintenanceCost).toBeCloseTo(200);
    expect(res.body[0].materialCost).toBeCloseTo(5);
    expect(res.body[0].totalCost).toBeCloseTo(605);
  });

  it('aggregates downtime data', async () => {
    const res = await request(app)
      .get('/api/reports/downtime')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body).toHaveLength(1);
    const expectedPeriod = base.toISOString().slice(0, 7);
    expect(res.body[0].period).toBe(expectedPeriod);
    expect(res.body[0].downtime).toBe(4);
  });
});
