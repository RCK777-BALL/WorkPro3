/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from "vitest";
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import LineRoutes from '../routes/LineRoutes';
import Department from '../models/Department';
import User from '../models/User';

const app = express();
app.use(express.json());
app.use('/api/lines', LineRoutes);

let mongo: MongoMemoryServer;
let token: string;
let departmentId: string;
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
  });
  token = jwt.sign({ id: user._id.toString(), roles: user.roles }, process.env.JWT_SECRET!);
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
  });
  token = jwt.sign({ id: user._id.toString(), roles: user.roles }, process.env.JWT_SECRET!);

  const department = await Department.create({
    name: 'Production',
    tenantId: user.tenantId,
    lines: [
      { name: 'Line1', tenantId: user.tenantId, stations: [] },
      { name: 'Line2', tenantId: user.tenantId, stations: [] },
    ],
  });
  departmentId = department._id.toString();
});

describe('Line Routes', () => {
  it('lists lines with department id', async () => {
    const res = await request(app)
      .get('/api/lines')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.length).toBe(2);
    res.body.forEach((line: any) => {
      expect(line.departmentId).toBe(departmentId);
      expect(line.name).toBeDefined();
    });
  });
});
