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
import InventoryItem from '../models/InventoryItem';
import User from '../models/User';
import Site from '../models/Site';

const app = express();
app.use(express.json());
app.use('/api/inventory', inventoryRoutes);

let mongo: MongoMemoryServer;
let token: string;
let user: Awaited<ReturnType<typeof User.create>>;
let eachId: mongoose.Types.ObjectId;
let caseId: mongoose.Types.ObjectId;
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
    employeeId: 'INV-EMP-001',
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
  eachId = new mongoose.Types.ObjectId();
  caseId = new mongoose.Types.ObjectId();
  await mongoose.connection.db
    .collection('unitOfMeasure')
    .insertMany([
      { _id: eachId, name: 'Each' },
      { _id: caseId, name: 'Case' },
    ]);
  await mongoose.connection.db
    .collection('conversions')
    .insertMany([
      { from: caseId, to: eachId, factor: 12 },
      { from: eachId, to: caseId, factor: 1 / 12 },
    ]);
});

describe('Inventory Routes', () => {
  it('creates an inventory item', async () => {
    const res = await request(app)
      .post('/api/inventory')
      .set('Authorization', `Bearer ${token}`)
      .set('x-site-id', siteId.toString())
      .send({ name: 'Bolt', quantity: 10, tenantId: user.tenantId.toString() })
      .expect(201);

    expect(res.body.name).toBe('Bolt');

    const count = await InventoryItem.countDocuments();
    expect(count).toBe(1);
  });

  it('lists inventory items', async () => {
    await InventoryItem.create({ name: 'Item1', quantity: 5, tenantId: user.tenantId, siteId });
    await InventoryItem.create({ name: 'Item2', quantity: 3, tenantId: user.tenantId, siteId });

    const res = await request(app)
      .get('/api/inventory')
      .set('Authorization', `Bearer ${token}`)
      .set('x-site-id', siteId.toString())
      .expect(200);

    expect(res.body.length).toBe(2);
    expect(res.body[0].name).toBeDefined();
  });

  it('converts case to each usage', async () => {
    const item = await InventoryItem.create({
      name: 'Widget',
      quantity: 2,
      tenantId: user.tenantId,
      uom: caseId,
      siteId,
    });

    const res = await request(app)
      .post(`/api/inventory/${item._id}/use`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-site-id', siteId.toString())
      .send({ quantity: 6, uom: eachId.toString() })
      .expect(200);

    expect(res.body.quantity).toBeCloseTo(1.5);
  });

  it('converts each to case usage', async () => {
    const item = await InventoryItem.create({
      name: 'Widget',
      quantity: 24,
      tenantId: user.tenantId,
      uom: eachId,
      siteId,
    });

    const res = await request(app)
      .post(`/api/inventory/${item._id}/use`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-site-id', siteId.toString())
      .send({ quantity: 1, uom: caseId.toString() })
      .expect(200);

    expect(res.body.quantity).toBe(12);
  });

  it('returns error when conversion missing', async () => {
    const item = await InventoryItem.create({
      name: 'Widget',
      quantity: 1,
      tenantId: user.tenantId,
      uom: caseId,
      siteId,
    });
    const badUom = new mongoose.Types.ObjectId();

    await request(app)
      .post(`/api/inventory/${item._id}/use`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-site-id', siteId.toString())
      .send({ quantity: 1, uom: badUom.toString() })
      .expect(400);
  });
});
