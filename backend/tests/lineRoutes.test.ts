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
import Site from '../models/Site';
import Line from '../models/Line';

const app = express();
app.use(express.json());
app.use('/api/lines', LineRoutes);

let mongo: MongoMemoryServer;
let token: string;
let departmentId: string;
let user: Awaited<ReturnType<typeof User.create>>;
let siteId: mongoose.Types.ObjectId;

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
    employeeId: 'LINE-EMP-001',
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
  user = await User.create({
    name: 'Tester',
    email: 'tester@example.com',
    passwordHash: 'pass123',
    roles: ['supervisor'],
    tenantId: new mongoose.Types.ObjectId(),
    employeeId: 'LINE-EMP-001',
  });
  token = jwt.sign(
    { id: user._id.toString(), roles: user.roles, tenantId: user.tenantId.toString() },
    process.env.JWT_SECRET!,
  );

  const department = await Department.create({
    name: 'Production',
    tenantId: user.tenantId,
    plant: new mongoose.Types.ObjectId(),
    lines: [],
  });
  const site = await Site.create({ tenantId: user.tenantId, name: 'Main Site' });
  siteId = site._id;
  await Line.create([
    {
      name: 'Line1',
      tenantId: user.tenantId,
      departmentId: department._id,
      plant: siteId,
      siteId,
      stations: [],
    },
    {
      name: 'Line2',
      tenantId: user.tenantId,
      departmentId: department._id,
      plant: siteId,
      siteId,
      stations: [],
    },
  ]);
  departmentId = department._id.toString();
});

describe('Line Routes', () => {
  it('lists lines with department id', async () => {
    const res = await request(app)
      .get('/api/lines')
      .set('Authorization', `Bearer ${token}`)
      .set('x-site-id', siteId.toString())
      .expect(200);

    const payload = res.body.data ?? res.body;
    expect(payload.length).toBe(2);
    payload.forEach((line: any) => {
      expect(line.departmentId).toBe(departmentId);
      expect(line.name).toBeDefined();
    });
  });
});
