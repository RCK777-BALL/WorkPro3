/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from "vitest";
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import PMTaskRoutes from '../routes/PMTaskRoutes';
import User from '../models/User';

const app = express();
app.use(express.json());
app.use('/api/pm-tasks', PMTaskRoutes);
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
    roles: ['supervisor'],
    tenantId: new mongoose.Types.ObjectId(),
    employeeId: 'PM-EMP-001',
  });
  token = jwt.sign(
    { id: user._id.toString(), roles: ['admin'], tenantId: user.tenantId.toString() },
    process.env.JWT_SECRET!,
  );
});

describe('PM Task Routes', () => {
  it('requires authentication', async () => {
    await request(app)
      .get('/api/pm-tasks')
      .expect(401);
  });

  it('creates fetches updates and deletes a pm task', async () => {
    const createRes = await request(app)
      .post('/api/pm-tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'PM1', rule: { type: 'calendar', cron: '0 0 * * *' } })
      .expect(201);

    const id = createRes.body.data?._id ?? createRes.body._id;

    const listRes = await request(app)
      .get('/api/pm-tasks')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const listData = listRes.body.data ?? listRes.body;
    expect(listData.length).toBe(1);
    expect(listData[0]._id).toBe(id);

    const updateRes = await request(app)
      .put(`/api/pm-tasks/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Updated PM', rule: { type: 'calendar', cron: '0 0 * * *' } })
      .expect(200);

    expect((updateRes.body.data ?? updateRes.body).title).toBe('Updated PM');

    await request(app)
      .delete(`/api/pm-tasks/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const listAfter = await request(app)
      .get('/api/pm-tasks')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const listAfterData = listAfter.body.data ?? listAfter.body;
    expect(listAfterData.length).toBe(0);
  });
});

