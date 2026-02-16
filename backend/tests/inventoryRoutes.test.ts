/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from "vitest";
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';

import inventoryRoutes from '../routes/inventoryRoutes';
import User from '../models/User';
import InventoryItem from '../models/InventoryItem';
import Site from '../models/Site';

const app = express();
app.use(express.json());
app.use('/api/inventory', inventoryRoutes);

let mongo: MongoMemoryServer;
let token: string;
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
    employeeId: 'INVSUM-EMP-001',
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
  const site = await Site.create({ tenantId: user.tenantId, name: 'Main Site' });
  siteId = site._id;
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

describe('Inventory Routes', () => {
  it('returns inventory items with stock and status', async () => {
    await InventoryItem.create({
      name: 'Part A',
      quantity: 10,
      reorderThreshold: 5,
      tenantId: user.tenantId,
      siteId,
    });
    await InventoryItem.create({
      name: 'Part B',
      quantity: 2,
      reorderThreshold: 5,
      tenantId: user.tenantId,
      siteId,
    });

    const res = await request(app)
      .get('/api/inventory/summary')
      .set('Authorization', `Bearer ${token}`)
      .set('x-site-id', siteId.toString())
      .expect(200);

    expect(res.body).toEqual([
      { name: 'Part A', stock: 10, status: 'ok' },
      { name: 'Part B', stock: 2, status: 'low' },
    ]);
  });
});
