/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { requireAuth } from '../middleware/authMiddleware';
import requireRoles from '../middleware/requireRoles';

const app = express();
app.use(express.json());
app.get('/protected', requireAuth, requireRoles(['admin']), (_req, res) => {
  res.json({ ok: true });
});

let mongo: MongoMemoryServer;
let tokenAdmin: string;
let tokenGeneralManager: string;
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
  });
  tokenAdmin = jwt.sign({ id: admin._id.toString() }, process.env.JWT_SECRET!);

  const generalManager = await User.create({
    name: 'GM',
    email: 'gm@example.com',
    passwordHash: 'pass123',
    roles: ['general_manager'],
    tenantId: new mongoose.Types.ObjectId(),
  });
  tokenGeneralManager = jwt.sign({ id: generalManager._id.toString() }, process.env.JWT_SECRET!);

  const planner = await User.create({
    name: 'Planner',
    email: 'planner@example.com',
    passwordHash: 'pass123',
    roles: ['planner'],
    tenantId: new mongoose.Types.ObjectId(),
  });
  tokenPlanner = jwt.sign({ id: planner._id.toString() }, process.env.JWT_SECRET!);
});

describe('requireRoles middleware', () => {
  it('allows access when user has any required role', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);
    expect(res.body.ok).toBe(true);
  });

  it('allows access when user has equivalent role', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${tokenGeneralManager}`)
      .expect(200);
    expect(res.body.ok).toBe(true);
  });

  it('denies access when user lacks required roles', async () => {
    await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${tokenPlanner}`)
      .expect(403);
  });
});
