/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from "vitest";
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';

import TimeSheetRoutes from '../routes/TimeSheetRoutes';
import User from '../models/User';

const app = express();
app.use(express.json());
app.use('/api/timesheets', TimeSheetRoutes);

let mongo: MongoMemoryServer;
let token: string;
let user: Awaited<ReturnType<typeof User.create>>;

beforeAll(async () => {
  process.env.JWT_SECRET = 'testsecret';
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  user = await User.create({
    name: 'Tester',
    email: 'tester@example.com',
    passwordHash: 'pass123',
    roles: ['supervisor'],
    tenantId: new mongoose.Types.ObjectId(),
    employeeId: 'TS-EMP-001',
  });
  token = jwt.sign(
    { id: user._id.toString(), roles: user.roles, tenantId: user.tenantId.toString() },
    process.env.JWT_SECRET!,
  );
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await mongoose.connection.db?.dropDatabase();
  await User.create({
    _id: user._id,
    name: user.name,
    email: user.email,
    passwordHash: user.passwordHash,
    roles: user.roles,
    tenantId: user.tenantId,
    employeeId: user.employeeId,
  });
});

describe('TimeSheet Routes', () => {
  it('requires authentication', async () => {
    await request(app)
      .get('/api/timesheets')
      .expect(401);
  });

  it('creates and fetches a timesheet', async () => {
    const payload = {
      user: user._id.toString(),
      date: new Date().toISOString(),
      clockIn: new Date('2023-01-01T08:00:00Z'),
      clockOut: new Date('2023-01-01T16:00:00Z'),
      notes: 'Worked on project',
      totalHours: 8,
    };

    const createRes = await request(app)
      .post('/api/timesheets')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(201);

    const created = createRes.body.data ?? createRes.body;
    const id = created._id;

    const listRes = await request(app)
      .get('/api/timesheets')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const rows = listRes.body.data ?? listRes.body;
    expect(rows.length).toBe(1);
    expect(rows[0]._id).toBe(id);
    expect(rows[0].user).toBe(String(user._id));
  });

  it('fails validation for invalid user id', async () => {
    await request(app)
      .post('/api/timesheets')
      .set('Authorization', `Bearer ${token}`)
      .send({
        user: 'invalid',
        date: new Date().toISOString(),
        clockIn: new Date(),
        clockOut: new Date(),
        totalHours: 8,
      })
      .expect(500);
  });
});

