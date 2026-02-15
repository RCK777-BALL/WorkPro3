/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import ReportsRoutes from '../routes/reportsRoutes';
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
  process.env.LABOR_RATE = '50';
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
    roles: ['supervisor'],
    tenantId: new mongoose.Types.ObjectId(),
    employeeId: 'REPORT-EMP-001',
  });
  tenantId = user.tenantId;
  token = jwt.sign(
    { id: user._id.toString(), roles: user.roles, tenantId: tenantId.toString() },
    process.env.JWT_SECRET!,
  );

  base = new Date('2023-01-15T00:00:00Z');
  const invId = new mongoose.Types.ObjectId();
  await mongoose.connection.collection('inventories').insertOne({
    _id: invId,
    name: 'Part',
    unitCost: 5,
    quantity: 1,
    tenantId: tenantId.toString(),
    createdAt: base,
    updatedAt: base,
  });
  await mongoose.connection.collection('workhistories').insertOne({
    tenantId: tenantId.toString(),
    timeSpentHours: 4,
    memberId: 'REPORT-MEMBER-1',
    recentWork: [],
    materialsUsed: [invId],
    completedAt: base,
  });
  await mongoose.connection.collection('timesheets').insertOne({
    tenantId: tenantId.toString(),
    date: base,
    totalHours: 8,
  });
});

describe('Reports metrics', () => {
  it('aggregates cost data', async () => {
    const res = await request(app)
      .get('/api/reports/costs')
      .set('Authorization', `Bearer ${token}`)
      .set('x-tenant-id', tenantId.toString())
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    const expectedPeriod = base.toISOString().slice(0, 7);
    expect(res.body.data[0].period).toBe(expectedPeriod);
    const laborRate = Number(process.env.LABOR_RATE);
    expect(res.body.data[0].laborCost).toBeCloseTo(8 * laborRate);
    expect(res.body.data[0].maintenanceCost).toBeCloseTo(4 * laborRate);
    expect(res.body.data[0].materialCost).toBeCloseTo(5);
    expect(res.body.data[0].totalCost).toBeCloseTo(12 * laborRate + 5);
  });

  it('aggregates downtime data', async () => {
    const res = await request(app)
      .get('/api/reports/downtime')
      .set('Authorization', `Bearer ${token}`)
      .set('x-tenant-id', tenantId.toString())
      .expect(200);
    expect(res.body.data).toHaveLength(1);
    const expectedPeriod = base.toISOString().slice(0, 7);
    expect(res.body.data[0].period).toBe(expectedPeriod);
    expect(res.body.data[0].downtime).toBe(4);
  });

  it('combines long term trends and AI summary', async () => {
    const [trendRes, summaryRes] = await Promise.all([
      request(app)
        .get('/api/reports/long-term-trends?months=12')
        .set('Authorization', `Bearer ${token}`)
        .set('x-tenant-id', tenantId.toString()),
      request(app)
        .get('/api/reports/summary/ai?months=12')
        .set('Authorization', `Bearer ${token}`)
        .set('x-tenant-id', tenantId.toString()),
    ]);

    expect(trendRes.status).toBe(200);
    expect(Array.isArray(trendRes.body.data)).toBe(true);
    expect(trendRes.body.data[0]).toMatchObject({ period: expect.any(String) });
    expect(summaryRes.body.data.summary).toContain('AI insight');
  });

  it('saves a schedule preference', async () => {
    const payload = {
      dayOfMonth: 15,
      hourUtc: '10:30',
      recipients: ['ops@example.com'],
      sendEmail: true,
      sendDownloadLink: true,
      format: 'pdf',
      timezone: 'UTC',
    };

    const res = await request(app)
      .post('/api/reports/schedule')
      .set('Authorization', `Bearer ${token}`)
      .set('x-tenant-id', tenantId.toString())
      .send(payload)
      .expect(200);

    expect(res.body.data.dayOfMonth).toBe(15);
    expect(res.body.data.recipients).toContain('ops@example.com');
    expect(new Date(res.body.data.nextRun).getUTCDate()).toBe(15);
  });
});
