/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import InventoryItem from '../models/InventoryItem';
import TransferOrder from '../models/TransferOrder';
import { receiveTransfer } from '../services/transferService';
import closeOutTransfers from '../workers/transferCloseout';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe('transferService', () => {
  it('adjusts inventory quantities on receive', async () => {
    const tenantId = new mongoose.Types.ObjectId();
    const src = await InventoryItem.create({ tenantId, name: 'Part A', quantity: 10 });
    const dest = await InventoryItem.create({ tenantId, name: 'Part A', quantity: 5 });
    const order = await TransferOrder.create({
      items: [{ fromItem: src._id, toItem: dest._id, quantity: 3 }],
      status: 'in-transit'
    });
    await receiveTransfer(order._id.toString(), 'admin');
    const updatedSrc = await InventoryItem.findById(src._id);
    const updatedDest = await InventoryItem.findById(dest._id);
    expect(updatedSrc?.quantity).toBe(7);
    expect(updatedDest?.quantity).toBe(8);
  });

  it('throws on insufficient stock', async () => {
    const tenantId = new mongoose.Types.ObjectId();
    const src = await InventoryItem.create({ tenantId, name: 'Part B', quantity: 1 });
    const dest = await InventoryItem.create({ tenantId, name: 'Part B', quantity: 0 });
    const order = await TransferOrder.create({
      items: [{ fromItem: src._id, toItem: dest._id, quantity: 5 }],
      status: 'in-transit'
    });
    await expect(receiveTransfer(order._id.toString(), 'admin')).rejects.toThrow('Insufficient stock');
  });

  it('prevents unauthorized receive', async () => {
    const tenantId = new mongoose.Types.ObjectId();
    const src = await InventoryItem.create({ tenantId, name: 'Part C', quantity: 2 });
    const dest = await InventoryItem.create({ tenantId, name: 'Part C', quantity: 0 });
    const order = await TransferOrder.create({
      items: [{ fromItem: src._id, toItem: dest._id, quantity: 1 }],
      status: 'in-transit'
    });
    await expect(receiveTransfer(order._id.toString(), 'tech')).rejects.toThrow('Forbidden');
  });

  it('closes fully received orders', async () => {
    const tenantId = new mongoose.Types.ObjectId();
    const src = await InventoryItem.create({ tenantId, name: 'Part D', quantity: 5 });
    const dest = await InventoryItem.create({ tenantId, name: 'Part D', quantity: 1 });
    const order = await TransferOrder.create({
      items: [{ fromItem: src._id, toItem: dest._id, quantity: 2, status: 'received' }],
      status: 'in-transit'
    });
    await closeOutTransfers();
    const closed = await TransferOrder.findById(order._id);
    expect(closed?.status).toBe('closed');
  });
});
