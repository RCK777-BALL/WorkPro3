/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from "vitest";
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';

import predictiveRoutes from '../routes/PredictiveRoutes';
import User from '../models/User';
import Asset from '../models/Asset';
import SensorReading from '../models/SensorReading';
import Notification from '../models/Notifications';

const app = express();
app.use(express.json());
app.use('/api/predictive', predictiveRoutes);

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
    employeeId: 'EMP001',
  });
  token = jwt.sign({ id: user._id.toString(), roles: user.roles }, process.env.JWT_SECRET!);
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
    passwordHash: 'pass123',
    roles: user.roles,
    tenantId: user.tenantId,
    employeeId: user.employeeId,
  });
});

describe('Predictive Routes', () => {
  it('returns predictions only for authenticated tenant', async () => {
    const otherTenant = new mongoose.Types.ObjectId();
    const asset1 = await Asset.create({
      name: 'A1',
      type: 'Mechanical',
      location: 'Loc1',
      tenantId: user.tenantId,
    });
    const asset2 = await Asset.create({
      name: 'A2',
      type: 'Mechanical',
      location: 'Loc2',
      tenantId: otherTenant,
    });

    await SensorReading.create([
      { asset: asset1._id, metric: 'temp', value: 90, tenantId: user.tenantId },
      { asset: asset1._id, metric: 'temp', value: 95, tenantId: user.tenantId },
      { asset: asset2._id, metric: 'temp', value: 90, tenantId: otherTenant },
      { asset: asset2._id, metric: 'temp', value: 95, tenantId: otherTenant },
    ]);

    const res = await request(app)
      .get('/api/predictive')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0].asset).toBe(asset1._id.toString());

    const notes = await Notification.find();
    expect(notes.length).toBe(1);
    expect(notes[0].tenantId.toString()).toBe(user.tenantId.toString());
  });
});

