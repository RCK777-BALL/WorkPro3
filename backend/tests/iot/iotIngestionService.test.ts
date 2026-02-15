/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import ConditionRule from '../../models/ConditionRule';
import WorkOrder from '../../models/WorkOrder';
import Asset from '../../models/Asset';
import { ingestTelemetryBatch } from '../../services/iotIngestionService';

const tenantId = new mongoose.Types.ObjectId().toString();

describe('IoT ingestion threshold logic', () => {
  let mongo: MongoMemoryServer;
  let asset: Awaited<ReturnType<typeof Asset.create>>;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  beforeEach(async () => {
    await mongoose.connection.db?.dropDatabase();
    asset = await Asset.create({
      name: 'Test asset',
      type: 'Mechanical',
      location: 'Area 1',
      tenantId,
      plant: new mongoose.Types.ObjectId(),
    });
    await ConditionRule.create({
      asset: asset._id,
      metric: 'temperature',
      operator: '>',
      threshold: 80,
      workOrderTitle: 'Investigate overheating',
      tenantId,
    });
  });

  it('creates work orders when readings cross configured thresholds', async () => {
    const summary = await ingestTelemetryBatch({
      tenantId,
      readings: [
        { assetId: asset._id.toString(), metric: 'temperature', value: 85 },
        { assetId: asset._id.toString(), metric: 'temperature', value: 75 },
      ],
    });

    expect(summary.triggeredRules).toHaveLength(1);
    expect(summary.triggeredRules[0]?.created).toBe(true);
    expect(await WorkOrder.countDocuments()).toBe(1);
  });

  it('avoids duplicate work orders while rule remains active with open work', async () => {
    await ingestTelemetryBatch({
      tenantId,
      readings: [{ assetId: asset._id.toString(), metric: 'temperature', value: 90 }],
    });
    expect(await WorkOrder.countDocuments()).toBe(1);

    const followUp = await ingestTelemetryBatch({
      tenantId,
      readings: [{ assetId: asset._id.toString(), metric: 'temperature', value: 95 }],
    });

    expect(followUp.triggeredRules[0]?.created).toBe(false);
    expect(await WorkOrder.countDocuments()).toBe(1);
  });
});
