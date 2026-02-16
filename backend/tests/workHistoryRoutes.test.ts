/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';

import WorkHistoryRoutes from '../routes/WorkHistoryRoutes';
import User from '../models/User';

const app = express();
app.use(express.json());
app.use('/api/work-history', WorkHistoryRoutes);

let mongo: MongoMemoryServer | undefined;
let token: string;
let user: Awaited<ReturnType<typeof User.create>>;

const buildPayload = () => ({
  memberId: user._id.toString(),
  performedBy: user._id.toString(),
  metrics: {
    safety: {
      incidentRate: 0.8,
      lastIncidentDate: '2024-01-15',
      safetyCompliance: 95,
      nearMisses: 2,
      safetyMeetingsAttended: 10,
    },
    people: {
      attendanceRate: 96,
      teamCollaboration: 4.2,
      trainingHours: 12,
      certifications: ['Test Cert'],
      mentorshipHours: 5,
    },
    productivity: {
      completedTasks: 20,
      onTimeCompletion: 90,
      averageResponseTime: '2h',
      overtimeHours: 3,
      taskEfficiencyRate: 92,
    },
    improvement: {
      costSavings: 1200,
      suggestionsSubmitted: 3,
      suggestionsImplemented: 2,
      processImprovements: 1,
    },
  },
  recentWork: [
    {
      id: 'entry-1',
      date: '2024-03-01T00:00:00.000Z',
      type: 'maintenance',
      title: 'Inspect Pump',
      status: 'completed',
      duration: 4,
      notes: 'All good',
      category: 'productivity',
    },
  ],
});

beforeAll(async () => {
  process.env.JWT_SECRET = 'testsecret';
  mongo = await MongoMemoryServer.create({
    binary: {
      version: '7.0.5',
      os: {
        dist: 'ubuntu2004',
      },
    },
  });
  await mongoose.connect(mongo.getUri());
  user = await User.create({
    name: 'Work Tester',
    email: 'work@test.com',
    passwordHash: 'hash',
    roles: ['supervisor'],
    tenantId: new mongoose.Types.ObjectId(),
    employeeId: 'WH-EMP-001',
  });
  token = jwt.sign({ id: user._id.toString(), tenantId: user.tenantId?.toString() }, process.env.JWT_SECRET!);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) {
    await mongo.stop();
  }
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

describe('WorkHistoryRoutes', () => {
  it('requires authentication', async () => {
    await request(app)
      .get('/api/work-history')
      .expect(401);
  });

  it('creates, updates, and fetches work history for a member', async () => {
    const payload = buildPayload();

    const createRes = await request(app)
      .post('/api/work-history')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(201);

    expect(createRes.body.success).toBe(true);
    const created = createRes.body.data;
    expect(created).toBeDefined();
    expect(created.metrics.safety.incidentRate).toBe(payload.metrics.safety.incidentRate);

    const listRes = await request(app)
      .get('/api/work-history')
      .query({ memberId: user._id.toString() })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(listRes.body.success).toBe(true);
    expect(listRes.body.data).toBeDefined();
    expect(listRes.body.data.recentWork[0].title).toBe('Inspect Pump');

    const updatePayload = {
      ...payload,
      metrics: {
        ...payload.metrics,
        productivity: {
          ...payload.metrics.productivity,
          completedTasks: 42,
        },
      },
      recentWork: [
        {
          ...payload.recentWork[0],
          title: 'Inspect Pump - Updated',
        },
      ],
    };

    const updateRes = await request(app)
      .put(`/api/work-history/${created._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send(updatePayload)
      .expect(200);

    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.metrics.productivity.completedTasks).toBe(42);

    const refetch = await request(app)
      .get('/api/work-history')
      .query({ memberId: user._id.toString() })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(refetch.body.data.metrics.productivity.completedTasks).toBe(42);
    expect(refetch.body.data.recentWork[0].title).toBe('Inspect Pump - Updated');
  });
});

