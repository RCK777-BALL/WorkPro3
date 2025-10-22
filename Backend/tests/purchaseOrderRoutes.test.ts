/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import purchaseOrderRoutes from '../routes/PurchaseOrderRoutes';

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  const tenantId = req.header('x-tenant-id');
  if (tenantId) (req as any).tenantId = tenantId;
  next();
});
app.use('/purchase-orders', purchaseOrderRoutes);

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await mongoose.connection.db.dropDatabase();
});

describe('PurchaseOrder routes', () => {
  it('prevents tenants from accessing others\' purchase orders', async () => {
    const tenantA = new mongoose.Types.ObjectId().toString();
    const tenantB = new mongoose.Types.ObjectId().toString();
    const vendor = new mongoose.Types.ObjectId().toString();
    const item = new mongoose.Types.ObjectId().toString();

    const createRes = await request(app)
      .post('/purchase-orders')
      .set('x-tenant-id', tenantA)
      .send({ vendor, items: [{ item, quantity: 1 }] })
      .expect(201);

    const id = createRes.body._id;

    const ownRes = await request(app)
      .get(`/purchase-orders/${id}`)
      .set('x-tenant-id', tenantA)
      .expect(200);
    expect(ownRes.body._id).toBe(id);

    await request(app)
      .get(`/purchase-orders/${id}`)
      .set('x-tenant-id', tenantB)
      .expect(404);
  });
});

