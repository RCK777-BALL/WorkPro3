/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import Asset from '../models/Asset';
import Meter from '../models/Meter';
import MeterReading from '../models/MeterReading';
import WorkOrder from '../models/WorkOrder';
import PMTask from '../models/PMTask';
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

describe('meter based PM generation', () => {
  it('creates work order when interval exceeded', async () => {
    const asset = await Asset.create({
      name: 'A1',
      type: 'Mechanical',
      location: 'L1',
      tenantId,
      siteId,
      plant: siteId,
    });
    const meter = await Meter.create({
      asset: asset._id,
      name: 'Run Hours',
      unit: 'hours',
      pmInterval: 100,
      currentValue: 0,
      lastWOValue: 0,
      tenantId,
      siteId,
    });
    await PMTask.create({
      title: 'Meter Task',
      tenantId,
      asset: asset._id,
      siteId,
      rule: { type: 'meter', meterName: 'Run Hours', threshold: 100 },
      assignments: [
        {
          asset: asset._id,
          trigger: { type: 'meter', meterThreshold: 100 },
        },
      ],
    });
    await MeterReading.create({ meter: meter._id, value: 120, tenantId, siteId });
    meter.currentValue = 120;
    await meter.save();

    await runPMScheduler();
    expect(await WorkOrder.countDocuments()).toBe(1);

    const updated = await Meter.findById(meter._id);
    expect(updated?.lastWOValue).toBe(120);
  });
});
