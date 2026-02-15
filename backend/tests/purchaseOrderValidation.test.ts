/*
 * SPDX-License-Identifier: MIT
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';

import PartModel from '../src/modules/inventory/models/Part';
import PurchaseOrderModel from '../src/modules/purchase-orders/model';
import {
  receivePurchaseOrder,
  savePurchaseOrder,
  transitionPurchaseOrder,
  PurchaseOrderError,
} from '../src/modules/purchase-orders/service';
import {
  purchaseOrderInputSchema,
  receivePurchaseOrderSchema,
  statusInputSchema,
} from '../src/modules/purchase-orders/validation';

describe('purchase order validation and guards', () => {
  let mongo: MongoMemoryServer;
  const tenantId = new mongoose.Types.ObjectId().toString();
  const vendorId = new mongoose.Types.ObjectId().toString();

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

  it('validates purchase order payloads and status inputs', () => {
    const valid = purchaseOrderInputSchema.parse({
      vendorId,
      items: [{ partId: new mongoose.Types.ObjectId().toString(), quantity: 3, unitCost: 12.5 }],
      status: 'draft',
    });

    expect(valid.status).toBe('draft');
    expect(() =>
      purchaseOrderInputSchema.parse({ vendorId: '', items: [], status: 'pending' }),
    ).toThrow();
    expect(() => statusInputSchema.parse({ status: 'archived' })).toThrow();
    expect(() => receivePurchaseOrderSchema.parse({ receipts: [] })).toThrow();
  });

  it('enforces valid status transitions', async () => {
    const po = await savePurchaseOrder(
      { tenantId },
      {
        vendorId,
        items: [{ partId: new mongoose.Types.ObjectId().toString(), quantity: 5 }],
      },
    );

    const sent = await transitionPurchaseOrder({ tenantId }, po.id, 'sent');
    expect(sent.status).toBe('sent');
    await expect(
      transitionPurchaseOrder({ tenantId }, sent.id, 'closed' as any),
    ).rejects.toBeInstanceOf(PurchaseOrderError);
  });

  it('guards against over-receipt while updating parts', async () => {
    const part = await PartModel.create({ tenantId, name: 'Widget', quantity: 0 });
    const po = await savePurchaseOrder(
      { tenantId },
      {
        vendorId,
        items: [{ partId: part._id.toString(), quantity: 5, unitCost: 9 }],
        status: 'sent',
      },
    );

    const received = await receivePurchaseOrder(
      { tenantId },
      po.id,
      [{ partId: part._id.toString(), quantity: 10 }],
    );

    const reloaded = await PurchaseOrderModel.findById(received.id);
    const updatedPart = await PartModel.findById(part._id);

    expect(received.items[0].received).toBe(5);
    expect(reloaded?.items[0].status).toBe('received');
    expect(updatedPart?.quantity).toBe(10);
  });
});
