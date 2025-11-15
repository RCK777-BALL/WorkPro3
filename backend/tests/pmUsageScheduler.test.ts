/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import Asset from '../models/Asset';
import PMTask from '../models/PMTask';
import ProductionRecord from '../models/ProductionRecord';
import WorkOrder from '../models/WorkOrder';
import { runPMScheduler } from '../services/PMScheduler';

let mongo: MongoMemoryServer;
let tenantId: mongoose.Types.ObjectId;
let siteId: mongoose.Types.ObjectId;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  tenantId = new mongoose.Types.ObjectId();
  siteId = new mongoose.Types.ObjectId();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await mongoose.connection.db?.dropDatabase();
});

describe('usage-aware PM scheduling', () => {
  it('generates a work order when run-hour usage reaches the configured threshold', async () => {
    const asset = await Asset.create({
      name: 'Mixer 12',
      type: 'Mechanical',
      location: 'Line 1',
      tenantId,
      siteId,
    });

    await PMTask.create({
      title: 'Usage PM',
      tenantId,
      rule: { type: 'calendar', cron: '0 0 * * *' },
      assignments: [
        {
          asset: asset._id,
          interval: 'every 30 days',
          usageMetric: 'runHours',
          usageTarget: 12,
          usageLookbackDays: 30,
        } as any,
      ],
    });

    const now = new Date();
    await ProductionRecord.create([
      {
        asset: asset._id,
        tenantId,
        recordedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
        runTimeMinutes: 360,
      },
      {
        asset: asset._id,
        tenantId,
        recordedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        runTimeMinutes: 420,
      },
    ]);

    await runPMScheduler();

    const workOrders = await WorkOrder.find().lean();
    expect(workOrders).toHaveLength(1);
    expect(workOrders[0]?.title).toContain('Usage PM');
  });
});
