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
import Site from '../models/Site';
const AssetRoutesModule: any = require('../routes/AssetRoutes');
const AssetRoutes: any = AssetRoutesModule.default ?? AssetRoutesModule;

const app = express();
app.use(express.json());
app.use('/api/assets', AssetRoutes);

let mongo: MongoMemoryServer;
let token: string;
let user: any;
let siteA: mongoose.Types.ObjectId;
let siteB: mongoose.Types.ObjectId;

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
  const createdUser = new User({
    name: 'Tester',
    email: 'tester@example.com',
    passwordHash: 'pass123',
    roles: ['supervisor'],
    tenantId: new mongoose.Types.ObjectId(),
    employeeId: 'EMP-1',
  });
  await createdUser.save();
  user = createdUser;
  token = jwt.sign(
    { id: user._id.toString(), roles: user.roles, tenantId: user.tenantId.toString() },
    process.env.JWT_SECRET!,
  );
  siteA = new mongoose.Types.ObjectId();
  siteB = new mongoose.Types.ObjectId();
  await Site.create({ _id: siteA, tenantId: user.tenantId, name: 'Site A', slug: `site-a-${Date.now()}` });
  await Site.create({ _id: siteB, tenantId: user.tenantId, name: 'Site B', slug: `site-b-${Date.now()}` });
});

describe('Site isolation', () => {
  it('returns assets scoped to site header', async () => {
    await request(app)
      .post('/api/assets')
      .set('Authorization', `Bearer ${token}`)
      .set('x-site-id', siteA.toString())
      .send({ name: 'A', type: 'Mechanical', location: 'L', siteId: siteA, plant: siteA })
      .expect(201);
    await request(app)
      .post('/api/assets')
      .set('Authorization', `Bearer ${token}`)
      .set('x-site-id', siteB.toString())
      .send({ name: 'B', type: 'Mechanical', location: 'L', siteId: siteB, plant: siteB })
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
