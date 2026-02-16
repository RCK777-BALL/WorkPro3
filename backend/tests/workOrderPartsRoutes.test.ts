/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import WorkOrderRoutes from '../routes/workOrdersRoutes';
import WorkOrder from '../models/WorkOrder';
import User from '../models/User';
import PartStock from '../models/PartStock';
import InventoryPart from '../src/modules/inventory/models/Part';
import InventoryMovement from '../models/InventoryMovement';
import WorkOrderPartLineItem from '../models/WorkOrderPartLineItem';
import Site from '../models/Site';

declare module 'vitest' {
  export interface ProvidedContext {
    token?: string;
  }
}

const app = express();
app.use(express.json());
app.use('/api/workorders', WorkOrderRoutes);

let mongo: MongoMemoryReplSet;
let token: string;
let tenantId: mongoose.Types.ObjectId;
let workOrder: Awaited<ReturnType<typeof WorkOrder.create>>;
let stock: Awaited<ReturnType<typeof PartStock.create>>;
let siteId: mongoose.Types.ObjectId;

beforeAll(async () => {
  process.env.JWT_SECRET = 'testsecret';
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await mongoose.connection.db?.dropDatabase();
  tenantId = new mongoose.Types.ObjectId();
  const user = await User.create({
    name: 'Tester',
    email: 'tester@example.com',
    passwordHash: 'pass123',
    roles: ['admin'],
    tenantId,
    employeeId: 'EMP-1',
  });
  token = jwt.sign(
    { id: user._id.toString(), roles: ['admin'], tenantId: tenantId.toString() },
    process.env.JWT_SECRET!,
  );
  const site = await Site.create({ tenantId, name: 'Main Site' });
  siteId = site._id;

  const part = await InventoryPart.create({
    tenantId,
    siteId,
    name: 'Bolt',
    quantity: 10,
    unitCost: 2,
  });

  stock = await PartStock.create({
    tenantId,
    siteId,
    partId: part._id,
    onHand: 10,
    reserved: 0,
    unitCost: 2,
  });

  workOrder = await WorkOrder.create({
    tenantId,
    title: 'Parts Test',
    status: 'requested',
    priority: 'medium',
    type: 'corrective',
    plant: siteId,
    siteId,
  });
});

describe('Work order parts endpoints', () => {
  it('reserves, issues, returns parts and updates totals/movements', async () => {
    const reserveRes = await request(app)
      .post(`/api/workorders/${workOrder._id.toString()}/parts/reserve`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-site-id', siteId.toString())
      .send({ stockId: stock._id.toString(), quantity: 3, unitCost: 5 })
      .expect(200);

    expect(reserveRes.body.success).toBe(true);
    const afterReserve = await PartStock.findById(stock._id).lean();
    expect(afterReserve?.onHand).toBe(7);
    expect(afterReserve?.reserved).toBe(3);

    const issueRes = await request(app)
      .post(`/api/workorders/${workOrder._id.toString()}/parts/issue`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-site-id', siteId.toString())
      .send({ stockId: stock._id.toString(), quantity: 2 })
      .expect(200);

    expect(issueRes.body.data[0].qtyIssued).toBe(2);
    const afterIssue = await PartStock.findById(stock._id).lean();
    expect(afterIssue?.reserved).toBe(1);

    await request(app)
      .post(`/api/workorders/${workOrder._id.toString()}/parts/return`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-site-id', siteId.toString())
      .send({ stockId: stock._id.toString(), quantity: 1 })
      .expect(200);

    const afterReturn = await PartStock.findById(stock._id).lean();
    expect(afterReturn?.onHand).toBe(8);
    expect(afterReturn?.reserved).toBe(1);

    const updatedWorkOrder = await WorkOrder.findById(workOrder._id).lean();
    expect(updatedWorkOrder?.partsCostTotal).toBe(5 * 1);
    expect(updatedWorkOrder?.partsCost).toBe(5);
    expect(updatedWorkOrder?.totalCost).toBe(5);

    const movements = await InventoryMovement.find({ workOrderId: workOrder._id }).lean();
    expect(movements.map((m) => m.type)).toContain('reserve');
    expect(movements.map((m) => m.type)).toContain('issue');
    expect(movements.map((m) => m.type)).toContain('return');
  });

  it('prevents cross-tenant actions and negative balances', async () => {
    const otherTenant = new mongoose.Types.ObjectId();
    const otherStock = await PartStock.create({ tenantId: otherTenant, partId: stock.partId, onHand: 1, reserved: 0 });

    const badTenantRes = await request(app)
      .post(`/api/workorders/${workOrder._id.toString()}/parts/reserve`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-site-id', siteId.toString())
      .send({ stockId: otherStock._id.toString(), quantity: 1 })
      .expect(400);

    expect(badTenantRes.body.success).toBe(false);

    const tooMuchRes = await request(app)
      .post(`/api/workorders/${workOrder._id.toString()}/parts/reserve`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-site-id', siteId.toString())
      .send({ stockId: stock._id.toString(), quantity: 50 })
      .expect(400);
    expect(tooMuchRes.body.success).toBe(false);

    await request(app)
      .post(`/api/workorders/${workOrder._id.toString()}/parts/reserve`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-site-id', siteId.toString())
      .send({ stockId: stock._id.toString(), quantity: 1 })
      .expect(200);

    const overIssueRes = await request(app)
      .post(`/api/workorders/${workOrder._id.toString()}/parts/issue`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-site-id', siteId.toString())
      .send({ stockId: stock._id.toString(), quantity: 3 })
      .expect(400);
    expect(overIssueRes.body.success).toBe(false);
  });

  it('soft deletes line items and releases reservations', async () => {
    const reserveRes = await request(app)
      .post(`/api/workorders/${workOrder._id.toString()}/parts/reserve`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-site-id', siteId.toString())
      .send({ stockId: stock._id.toString(), quantity: 2 })
      .expect(200);

    const lineItems: Array<Awaited<ReturnType<typeof WorkOrderPartLineItem.findOne>>> = reserveRes.body.data;
    const lineItemId = lineItems[0]?._id as mongoose.Types.ObjectId;

    await request(app)
      .delete(`/api/workorders/${workOrder._id.toString()}/parts/${lineItemId.toString()}`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-site-id', siteId.toString())
      .expect(200);

    const deleted = await WorkOrderPartLineItem.findById(lineItemId).lean();
    expect(deleted?.deletedAt).toBeInstanceOf(Date);

    const listRes = await request(app)
      .get(`/api/workorders/${workOrder._id.toString()}/parts`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-site-id', siteId.toString())
      .expect(200);
    expect(listRes.body.data.length).toBe(0);

    const refreshedStock = await PartStock.findById(stock._id).lean();
    expect(refreshedStock?.onHand).toBe(10);
    expect(refreshedStock?.reserved).toBe(0);

    const postDeleteWorkOrder = await WorkOrder.findById(workOrder._id).lean();
    expect(postDeleteWorkOrder?.partsCostTotal).toBe(0);
    expect(postDeleteWorkOrder?.totalCost).toBe(0);
  });
});
