/*
 * SPDX-License-Identifier: MIT
 */

import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';

import PartModel from '../src/modules/inventory/models/Part';
import PurchaseOrderModel from '../src/modules/purchase-orders/model';
import purchaseOrderRouter from '../src/modules/purchase-orders/router';
import User from '../models/User';
import Site from '../models/Site';

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
  let token: string;
  let siteId: string;
  let otherSiteId: string;
  const authHeaders = (tenant: string = tenantId, site: string = siteId) => ({
    Authorization: `Bearer ${token}`,
    'x-tenant-id': tenant,
    'x-site-id': site,
  });

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
    await mongoose.connection.db.dropDatabase();
    const tenantSite = await Site.create({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      name: 'Tenant Site',
      slug: 'tenant-site',
    });
    const otherTenantSite = await Site.create({
      tenantId: new mongoose.Types.ObjectId(otherTenantId),
      name: 'Other Tenant Site',
      slug: 'other-tenant-site',
    });
    siteId = tenantSite._id.toString();
    otherSiteId = otherTenantSite._id.toString();

    const user = await User.create({
      name: 'PO Admin',
      email: 'po-admin@example.com',
      passwordHash: 'hash',
      roles: ['admin'],
      tenantId: new mongoose.Types.ObjectId(tenantId),
      employeeId: 'EMP-PO-ADMIN',
    });
    token = jwt.sign(
      { id: user._id.toString(), tenantId, roles: user.roles },
      process.env.JWT_SECRET!,
    );
  });

  it('creates, sends, receives, and updates stock and costs', async () => {
    const part = await PartModel.create({ tenantId, name: 'Valve', quantity: 2, unitCost: 1 });

    const createRes = await request(app)
      .post('/purchase-orders')
      .set(authHeaders())
      .send({
        vendorId,
        items: [{ partId: part._id.toString(), quantity: 3, unitCost: 4.5 }],
      })
      .expect(201);

    expect(createRes.body.status).toBe('draft');
    expect(createRes.body.totalCost).toBeCloseTo(13.5);

    const toPending = await request(app)
      .post(`/purchase-orders/${createRes.body.id}/status`)
      .set(authHeaders())
      .send({ status: 'sent' })
      .expect(200);
    expect(toPending.body.status).toBe('sent');

    const receipt = await request(app)
      .post(`/purchase-orders/${createRes.body.id}/receive`)
      .set(authHeaders())
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
      .set(authHeaders())
      .send({
        vendorId,
        items: [{ partId: part._id.toString(), quantity: 1 }],
      })
      .expect(201);

    await request(app)
      .post(`/purchase-orders/${body.id}/status`)
      .set(authHeaders(otherTenantId, otherSiteId))
      .send({ status: 'sent' })
      .expect(404);

    await request(app)
      .post(`/purchase-orders/${body.id}/receive`)
      .set(authHeaders(otherTenantId, otherSiteId))
      .send({ receipts: [{ partId: part._id.toString(), quantity: 1 }] })
      .expect(404);
  });
});
