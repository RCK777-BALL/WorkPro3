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
import AssetRoutes from '../routes/AssetRoutes';

const app = express();
app.use(express.json());
app.use('/api/assets', AssetRoutes);

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
    role: 'manager',
    tenantId: new mongoose.Types.ObjectId(),
  });
  token = jwt.sign({ id: user._id.toString(), role: user.role }, process.env.JWT_SECRET!);
});

describe('Site isolation', () => {
  it('returns assets scoped to site header', async () => {
    const siteA = new mongoose.Types.ObjectId();
    const siteB = new mongoose.Types.ObjectId();

    await request(app)
      .post('/api/assets')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'A', type: 'Mechanical', location: 'L', siteId: siteA })
      .expect(201);
    await request(app)
      .post('/api/assets')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'B', type: 'Mechanical', location: 'L', siteId: siteB })
      .expect(201);

    const res = await request(app)
      .get('/api/assets')
      .set('Authorization', `Bearer ${token}`)
      .set('x-site-id', siteA.toString())
      .expect(200);

    expect(res.body.length).toBe(1);
    expect(res.body[0].name).toBe('A');
  });
});
