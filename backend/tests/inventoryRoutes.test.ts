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

const app = express();
app.use(express.json());
app.use('/api/inventory', inventoryRoutes);

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
  });
  token = jwt.sign({ id: user._id.toString(), roles: user.roles }, process.env.JWT_SECRET!);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await mongoose.connection.db?.dropDatabase();
});

describe('Inventory Routes', () => {
  it('returns inventory items with stock and status', async () => {
    await InventoryItem.create({
      name: 'Part A',
      quantity: 10,
      reorderThreshold: 5,
      tenantId: user.tenantId,
    });
    await InventoryItem.create({
      name: 'Part B',
      quantity: 2,
      reorderThreshold: 5,
      tenantId: user.tenantId,
    });

    const res = await request(app)
      .get('/api/inventory/summary')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toEqual([
      { name: 'Part A', stock: 10, status: 'ok' },
      { name: 'Part B', stock: 2, status: 'low' },
    ]);
  });
});
