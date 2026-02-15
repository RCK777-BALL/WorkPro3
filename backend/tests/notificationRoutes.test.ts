import { describe, it, beforeAll, afterAll, beforeEach, expect, vi } from 'vitest';

import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';

import notificationRoutes from '../routes/notificationsRoutes';
import Notification from '../models/Notification';
import User, { type UserDocument } from '../models/User';
import type { MockIO } from './testUtils';
import { castFixture } from './testUtils';

const app = express();
app.use(express.json());
app.use('/api/notifications', notificationRoutes);

const io: MockIO = { emit: vi.fn() };
app.set('io', io);

let mongo: MongoMemoryServer;
let tenantA: mongoose.Types.ObjectId;
let tenantB: mongoose.Types.ObjectId;
let tokenA: string;
let tokenB: string;
let userA: UserDocument;
let userB: UserDocument;

beforeAll(async () => {
  process.env.JWT_SECRET = 'testsecret';
  mongo = await MongoMemoryServer.create({ binary: { version: '7.0.5' } });
  await mongoose.connect(mongo.getUri());
  tenantA = new mongoose.Types.ObjectId();
  tenantB = new mongoose.Types.ObjectId();
  userA = castFixture<UserDocument>(await User.create({
    name: 'A',
    email: 'a@example.com',
    passwordHash: 'pass',
    roles: ['admin'],
    tenantId: tenantA,
    employeeId: 'A1',
  }));
  userB = castFixture<UserDocument>(await User.create({
    name: 'B',
    email: 'b@example.com',
    passwordHash: 'pass',
    roles: ['admin'],
    tenantId: tenantB,
    employeeId: 'B1',
  }));
  tokenA = jwt.sign(
    { id: userA._id.toString(), roles: userA.roles, tenantId: tenantA.toString() },
    process.env.JWT_SECRET!,
  );
  tokenB = jwt.sign(
    { id: userB._id.toString(), roles: userB.roles, tenantId: tenantB.toString() },
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
    _id: userA._id,
    name: userA.name,
    email: userA.email,
    passwordHash: userA.passwordHash,
    roles: userA.roles,
    tenantId: tenantA,
    employeeId: userA.employeeId,
  });
  await User.create({
    _id: userB._id,
    name: userB.name,
    email: userB.email,
    passwordHash: userB.passwordHash,
    roles: userB.roles,
    tenantId: tenantB,
    employeeId: userB.employeeId,
  });
  io.emit.mockReset();
});

describe('Notification Routes', () => {
  it('creates notification and emits event', async () => {
    const res = await request(app)
      .post('/api/notifications')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ title: 'hi', message: 'hello', type: 'info' })
      .expect(201);

    expect(res.body.data.message).toBe('hello');
    expect(res.body.data.tenantId).toBe(tenantA.toString());
    expect(io.emit).toHaveBeenCalledTimes(1);
    const [eventName, payload] = io.emit.mock.calls[0];
    expect(eventName).toBe('notification');
    expect(payload._id.toString()).toBe(res.body.data._id);
  });

  it('retrieves notifications scoped to tenant', async () => {
    await Notification.create({ tenantId: tenantA, user: userA._id, message: 'A1', title: 't1', type: 'info' });
    await Notification.create({ tenantId: tenantB, user: userB._id, message: 'B1', title: 't2', type: 'info' });

    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].message).toBe('A1');
  });

  it('updates notification within tenant only', async () => {
    const note = await Notification.create({ tenantId: tenantA, user: userA._id, message: 'A1', title: 't1', type: 'info' });

    const res = await request(app)
      .put(`/api/notifications/${note._id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ read: true })
      .expect(200);

    expect(res.body.data.read).toBe(true);

    await request(app)
      .put(`/api/notifications/${note._id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ read: true })
      .expect(404);
  });
});
