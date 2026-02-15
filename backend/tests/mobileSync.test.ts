/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import WorkOrder from '../models/WorkOrder';
import Asset from '../models/Asset';
import PMTask from '../models/PMTask';
import MobileOfflineAction from '../models/MobileOfflineAction';
import { fetchDeltas, applyOfflineActions } from '../src/modules/mobile/service';

describe('mobile sync service', () => {
  let mongo: MongoMemoryServer;
  const tenantId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create({ binary: { version: '7.0.5' } });
    await mongoose.connect(mongo.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  beforeEach(async () => {
    await mongoose.connection.db?.dropDatabase();
  });

  it('pulls deltas for work orders, pms, and assets using last sync cursors', async () => {
    const wo = await WorkOrder.create({ tenantId, title: 'WO', status: 'requested' });
    const pm = await PMTask.create({
      tenantId,
      name: 'PM',
      title: 'PM Task',
      description: 'desc',
      rule: { type: 'calendar', cron: '0 0 * * *' },
    });
    const asset = await Asset.create({
      tenantId,
      name: 'Pump',
      type: 'Mechanical',
      location: 'Bay 1',
      plant: new mongoose.Types.ObjectId(),
    });

    const deltas = await fetchDeltas(tenantId, { workOrders: new Date(0).toISOString() });
    expect(deltas.workOrders).toHaveLength(1);
    expect(deltas.pms).toHaveLength(1);
    expect(deltas.assets).toHaveLength(1);
    expect(deltas.cursors.workOrders).not.toBeNull();
  });

  it('applies offline actions and logs conflicts with last-writer-wins', async () => {
    const wo = await WorkOrder.create({ tenantId, title: 'Existing', status: 'requested' });
    await WorkOrder.updateOne({ _id: wo._id }, { $set: { updatedAt: new Date(Date.now() + 5000) } });

    const { processed, conflicts } = await applyOfflineActions([
      {
        tenantId,
        userId,
        entityType: 'WorkOrder',
        entityId: wo._id,
        operation: 'update',
        payload: { status: 'closed' },
        version: Date.now(),
      },
    ]);

    const updated = await WorkOrder.findById(wo._id).lean();
    expect(updated?.status).toBe('closed');
    expect(processed).toHaveLength(1);
    expect(conflicts).toHaveLength(1);
  });

  it('replays actions by creating missing records and records offline actions', async () => {
    const newId = new mongoose.Types.ObjectId();
    const { processed, conflicts } = await applyOfflineActions([
      {
        tenantId,
        userId,
        entityType: 'WorkOrder',
        entityId: newId,
        operation: 'create',
        payload: { title: 'New WO' },
      },
    ]);

    expect(processed).toContain(String(newId));
    expect(conflicts).toHaveLength(0);
    const audit = await MobileOfflineAction.findOne({ entityId: newId }).lean();
    expect(audit).toBeTruthy();
  });
});
