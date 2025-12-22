/*
 * SPDX-License-Identifier: MIT
 */

import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';

import PartModel from '../src/modules/inventory/models/Part';
import PurchaseOrderModel from '../src/modules/purchase-orders/model';
import purchaseOrderRouter from '../src/modules/purchase-orders/router';

const buildApp = (tenantId: string) => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).tenantId = (req.headers['x-tenant-id'] as string) || tenantId;
    next();
  });
  app.use('/purchase-orders', purchaseOrderRouter);
  return app;
};

describe('purchase order end-to-end flow', () => {
  let mongo: MongoMemoryServer;
  const tenantId = new mongoose.Types.ObjectId().toString();
  const otherTenantId = new mongoose.Types.ObjectId().toString();
  const vendorId = new mongoose.Types.ObjectId().toString();
  const app = buildApp(tenantId);

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

  it('creates, sends, receives, and updates stock and costs', async () => {
    const part = await PartModel.create({ tenantId, name: 'Valve', quantity: 2, unitCost: 1 });

    const createRes = await request(app)
      .post('/purchase-orders')
      .send({
        vendorId,
        items: [{ partId: part._id.toString(), quantity: 3, unitCost: 4.5 }],
      })
      .expect(201);

    expect(createRes.body.status).toBe('draft');
    expect(createRes.body.totalCost).toBeCloseTo(13.5);

    const toPending = await request(app)
      .post(`/purchase-orders/${createRes.body.id}/status`)
      .send({ status: 'pending' })
      .expect(200);
    expect(toPending.body.status).toBe('pending');

    const approved = await request(app)
      .post(`/purchase-orders/${createRes.body.id}/status`)
      .send({ status: 'approved' })
      .expect(200);
    expect(approved.body.status).toBe('approved');

    const receipt = await request(app)
      .post(`/purchase-orders/${createRes.body.id}/receive`)
      .send({ receipts: [{ partId: part._id.toString(), quantity: 3 }] })
      .expect(200);

    expect(receipt.body.status).toBe('received');
    expect(receipt.body.items[0].received).toBe(3);
    const updatedPart = await PartModel.findById(part._id);
    expect(updatedPart?.quantity).toBe(5);

    const savedPo = await PurchaseOrderModel.findById(createRes.body.id);
    expect(savedPo?.items[0].unitCost).toBeCloseTo(4.5);
  });

  it('prevents cross-tenant access to purchase orders', async () => {
    const part = await PartModel.create({ tenantId, name: 'Gasket', quantity: 0 });
    const { body } = await request(app)
      .post('/purchase-orders')
      .send({
        vendorId,
        items: [{ partId: part._id.toString(), quantity: 1 }],
      })
      .expect(201);

    await request(app)
      .post(`/purchase-orders/${body.id}/status`)
      .set('x-tenant-id', otherTenantId)
      .send({ status: 'pending' })
      .expect(404);

    await request(app)
      .post(`/purchase-orders/${body.id}/receive`)
      .set('x-tenant-id', otherTenantId)
      .send({ receipts: [{ partId: part._id.toString(), quantity: 1 }] })
      .expect(404);
  });
});
