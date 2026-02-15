/*
 * SPDX-License-Identifier: MIT
 */

import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';

import inventoryRouter from '../../src/modules/inventory';
import PartModel from '../../src/modules/inventory/models/Part';
import LocationModel from '../../src/modules/inventory/models/Location';
import StockItemModel from '../../src/modules/inventory/models/StockItem';
import StockHistoryModel from '../../src/modules/inventory/models/StockHistory';
import InventoryTransferModel from '../../src/modules/inventory/models/Transfer';
import PurchaseOrderModel from '../../src/modules/inventory/models/PurchaseOrder';
import ReorderAlertModel from '../../src/modules/inventory/models/ReorderAlert';
import { transitionPurchaseOrder, adjustStock, listStockHistory, listAlerts, transferStock } from '../../src/modules/inventory/service';
import { authHeaders, createTestUser, resetDatabase, setupInMemoryMongo, teardownInMemoryMongo } from './fixtures';

let app: express.Express;
let adminHeaders: Record<string, string>;
let techHeaders: Record<string, string>;
let tenantId: mongoose.Types.ObjectId;
let siteId: mongoose.Types.ObjectId;
let adminUserId: string;
let techUserId: string;
let mongo: Awaited<ReturnType<typeof setupInMemoryMongo>>;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret';
  mongo = await setupInMemoryMongo();

  app = express();
  app.use(express.json());
  app.use('/inventory', inventoryRouter);
});

afterAll(async () => {
  await teardownInMemoryMongo(mongo);
});

beforeEach(async () => {
  await resetDatabase();

  const admin = await createTestUser('admin');
  tenantId = admin.tenantId;
  siteId = admin.siteId;
  const tech = await createTestUser('tech', tenantId, siteId);
  adminUserId = admin.user._id.toString();
  techUserId = tech.user._id.toString();
  adminHeaders = authHeaders(admin.token, tenantId, siteId);
  techHeaders = authHeaders(tech.token, tenantId, siteId);
});

describe('Inventory operations and permissions', () => {
  const buildContext = (userId: string) => ({ tenantId: tenantId.toString(), siteId: siteId.toString(), userId });

  const seedPartAndLocations = async () => {
    const part = await PartModel.create({
      tenantId,
      siteId,
      name: 'Bolt',
      partNo: 'B-1',
      quantity: 10,
      reorderPoint: 5,
    });
    const fromLocation = await LocationModel.create({ tenantId, siteId, code: 'A-1-a', store: 'A', room: '1', bin: 'a' });
    const toLocation = await LocationModel.create({ tenantId, siteId, code: 'B-1-b', store: 'B', room: '1', bin: 'b' });
    const stock = await StockItemModel.create({
      tenantId,
      siteId,
      part: part._id,
      location: fromLocation._id,
      quantity: 10,
    });
    return { part, fromLocation, toLocation, stock };
  };

  it('adjusts stock levels and records audit history', async () => {
    const { stock } = await seedPartAndLocations();

    const res = await request(app)
      .post('/inventory/stock/adjust')
      .set(adminHeaders)
      .send({ stockItemId: stock._id.toString(), delta: -3, reason: 'issue' })
      .expect(200);

    expect(res.body.data.newQuantity).toBe(7);

    const history = await StockHistoryModel.find({ tenantId }).lean();
    expect(history).toHaveLength(1);
    expect(history[0].delta).toBe(-3);
    expect(history[0].reason).toContain('issue');
    expect(history[0].createdBy?.toString()).toBe(adminUserId);
  });

  it('rejects stock adjustments without manage permission', async () => {
    const { stock } = await seedPartAndLocations();

    const res = await request(app)
      .post('/inventory/stock/adjust')
      .set(techHeaders)
      .send({ stockItemId: stock._id.toString(), delta: 1 });

    expect(res.status).toBe(403);
  });

  it('transfers stock between bins and records history entries', async () => {
    const { part, fromLocation, toLocation } = await seedPartAndLocations();

    const res = {
      body: {
        data: await transferStock(buildContext(adminUserId), {
          partId: part._id.toString(),
          fromLocationId: fromLocation._id.toString(),
          toLocationId: toLocation._id.toString(),
          quantity: 5,
        }),
      },
    };

    expect(res.body.data.quantity).toBe(5);

    const source = await StockItemModel.findOne({ part: part._id, location: fromLocation._id });
    const dest = await StockItemModel.findOne({ part: part._id, location: toLocation._id });
    expect(source?.quantity).toBe(5);
    expect(dest?.quantity).toBe(5);

    const history = await StockHistoryModel.find({ tenantId }).lean();
    expect(history).toHaveLength(2);
    const reasons = history.map((h) => h.reason);
    expect(reasons.some((reason) => reason?.includes('Transfer to'))).toBe(true);
    expect(reasons.some((reason) => reason?.includes('Transfer from'))).toBe(true);

    const transfers = await InventoryTransferModel.find({ tenantId }).lean();
    expect(transfers).toHaveLength(1);
    expect(transfers[0].createdBy?.toString()).toBe(adminUserId);
  });

  it('validates transfer input and prevents invalid requests', async () => {
    const { part, fromLocation } = await seedPartAndLocations();

    const res = await request(app)
      .post('/inventory/transfers')
      .set(adminHeaders)
      .send({
        partId: part._id.toString(),
        fromLocationId: fromLocation._id.toString(),
        toLocationId: fromLocation._id.toString(),
        quantity: 2,
      });

    expect(res.status).toBe(400);
  });

  it('applies receipts once and leaves stock unchanged on repeated calls', async () => {
    const { part } = await seedPartAndLocations();
    const purchaseOrder = await PurchaseOrderModel.create({
      tenantId,
      siteId,
      vendor: new mongoose.Types.ObjectId(),
      status: 'approved',
      items: [
        {
          part: part._id,
          quantity: 3,
        },
      ],
    });

    const context = buildContext(adminUserId);
    await transitionPurchaseOrder(context, purchaseOrder._id.toString(), {
      status: 'ordered',
    });
    const received = await transitionPurchaseOrder(context, purchaseOrder._id.toString(), {
      status: 'received',
      receipts: [{ partId: part._id.toString(), quantity: 3 }],
    });

    expect(received.status).toBe('Received');
    const updatedPart = await PartModel.findById(part._id);
    expect(updatedPart?.quantity).toBe(13);

    await expect(
      transitionPurchaseOrder(context, purchaseOrder._id.toString(), {
        status: 'received',
        receipts: [{ partId: part._id.toString(), quantity: 3 }],
      }),
    ).rejects.toThrowError();

    const unchanged = await PartModel.findById(part._id);
    expect(unchanged?.quantity).toBe(13);
  });

  it('supports direct service adjustments and history counts', async () => {
    const { part, fromLocation } = await seedPartAndLocations();
    const stock = await StockItemModel.findOne({ part: part._id, location: fromLocation._id });
    const context = buildContext(adminUserId);
    await adjustStock(context, { stockItemId: stock!._id.toString(), delta: 2, reason: 'cycle count' });

    const history = await listStockHistory(context);
    expect(history).toHaveLength(1);
    expect(history[0].reason).toContain('cycle count');
  });

  it('generates low-stock alerts only for parts below the threshold', async () => {
    const understocked = await PartModel.create({
      tenantId,
      siteId,
      name: 'Washer',
      partNo: 'W-1',
      quantity: 1,
      reorderPoint: 5,
    });
    await PartModel.create({
      tenantId,
      siteId,
      name: 'Nut',
      partNo: 'N-1',
      quantity: 10,
      reorderPoint: 5,
    });

    await ReorderAlertModel.create({
      tenantId,
      siteId,
      part: understocked._id,
      quantity: understocked.quantity,
      threshold: understocked.reorderPoint,
      status: 'open',
      triggeredAt: new Date(),
    });
    const alerts = await listAlerts(buildContext(adminUserId));
    expect(alerts.items.find((alert) => alert.partId === understocked._id.toString())).toBeDefined();
    expect(alerts.items.find((alert) => alert.partName === 'Nut')).toBeUndefined();
  });
});
