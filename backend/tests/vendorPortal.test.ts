/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';

import vendorPortalRoutes from '../routes/vendorPortal';
import PurchaseOrder from '../models/PurchaseOrder';
import Vendor from '../models/Vendor';

const app = express();
app.use(express.json());
app.use('/api/vendor', vendorPortalRoutes);

let mongo: MongoMemoryServer;
let vendor1: any;
let vendor2: any;
let token1: string;
let token2: string;
let po: any;

beforeAll(async () => {
  process.env.VENDOR_JWT_SECRET = 'vendsecret';
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await mongoose.connection.db.dropDatabase();
  vendor1 = await Vendor.create({ name: 'Vendor1' });
  vendor2 = await Vendor.create({ name: 'Vendor2' });
  token1 = jwt.sign({ id: vendor1._id.toString() }, process.env.VENDOR_JWT_SECRET!);
  token2 = jwt.sign({ id: vendor2._id.toString() }, process.env.VENDOR_JWT_SECRET!);
  po = await PurchaseOrder.create({
    vendor: vendor1._id,
    tenantId: new mongoose.Types.ObjectId(),
    items: [{ item: new mongoose.Types.ObjectId(), quantity: 1, received: 0 }],
  });
});

describe('Vendor portal purchase orders', () => {
  it('lists and updates purchase orders for a vendor', async () => {
    const listRes = await request(app)
      .get('/api/vendor/pos')
      .set('Authorization', `Bearer ${token1}`)
      .expect(200);
    expect(listRes.body.length).toBe(1);

    await request(app)
      .put(`/api/vendor/pos/${po._id}`)
      .set('Authorization', `Bearer ${token1}`)
      .send({ status: 'acknowledged' })
      .expect(200);

    const updated = await PurchaseOrder.findById(po._id);
    expect(updated?.status).toBe('acknowledged');
  });

  it('prevents accessing purchase orders of other vendors', async () => {
    await request(app)
      .put(`/api/vendor/pos/${po._id}`)
      .set('Authorization', `Bearer ${token2}`)
      .send({ status: 'acknowledged' })
      .expect(403);
  });
});
