/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import User from '../../models/User';
import { requireAuth } from '../../middleware/authMiddleware';
import authorize from '../../middleware/authorize';

const app = express();
app.use(express.json());
app.get('/protected', requireAuth, authorize('admin'), (_req, res) => {
  res.json({ ok: true });
});

let mongo: MongoMemoryServer;
let tokenAdmin: string;
let tokenPlanner: string;

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

  const admin = await User.create({
    name: 'Admin',
    email: 'admin@example.com',
    passwordHash: 'pass123',
    roles: ['admin'],
    tenantId: new mongoose.Types.ObjectId(),
    employeeId: 'EMP-AUTH-ADMIN',
  });
  tokenAdmin = jwt.sign(
    { id: admin._id.toString(), tenantId: admin.tenantId.toString(), roles: admin.roles },
    process.env.JWT_SECRET!,
  );

  const planner = await User.create({
    name: 'Planner',
    email: 'planner@example.com',
    passwordHash: 'pass123',
    roles: ['planner'],
    tenantId: new mongoose.Types.ObjectId(),
    employeeId: 'EMP-AUTH-PLANNER',
  });
  tokenPlanner = jwt.sign(
    { id: planner._id.toString(), tenantId: planner.tenantId.toString(), roles: planner.roles },
    process.env.JWT_SECRET!,
  );
});

describe('authorize middleware', () => {
  it('allows access when role is permitted', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);
    expect(res.body.ok).toBe(true);
  });

  it('denies access when role is not permitted', async () => {
    await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${tokenPlanner}`)
      .expect(403);
  });

  it('returns 401 when no authentication is provided', async () => {
    await request(app).get('/protected').expect(401);
  });
});
