/*
 * SPDX-License-Identifier: MIT
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import Asset from '../../backend/models/Asset';
import Plant from '../../backend/models/Plant';
import ConditionRule from '../../backend/models/ConditionRule';
import WorkOrder from '../../backend/models/WorkOrder';
import Meter from '../../backend/models/Meter';
import PMTask from '../../backend/models/PMTask';
import { ingestTelemetryBatch } from '../../backend/services/iotIngestionService';

describe('IoT ingestion thresholds', () => {
  let mongo: MongoMemoryServer;
  let tenantId: mongoose.Types.ObjectId;
  let assetId: string;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
    tenantId = new mongoose.Types.ObjectId();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongo) {
      await mongo.stop();
    }
  });

  beforeEach(async () => {
    await mongoose.connection.db?.dropDatabase();
    const plant = await Plant.create({ name: 'Main', tenantId });
    const asset = await Asset.create({
      name: 'Compressor',
      type: 'Mechanical',
      location: 'Plant 1',
      tenantId,
      plant: plant._id,
    });
    assetId = asset._id.toString();
  });

  it('creates work orders only when thresholds are crossed', async () => {
    const rule = await ConditionRule.create({
      tenantId,
      asset: assetId,
      metric: 'temp',
      operator: '>',
      threshold: 80,
      workOrderTitle: 'High temperature',
      active: true,
    });

    const below = await ingestTelemetryBatch({
      tenantId: tenantId.toString(),
      readings: [
        { assetId, metric: 'temp', value: 75, timestamp: new Date().toISOString() },
      ],
    });

    expect(below.triggeredRules).toHaveLength(0);
    expect(await WorkOrder.countDocuments()).toBe(0);

    const above = await ingestTelemetryBatch({
      tenantId: tenantId.toString(),
      readings: [
        { assetId, metric: 'temp', value: 92, timestamp: new Date().toISOString() },
      ],
    });

    expect(above.triggeredRules).toEqual([
      { ruleId: rule._id.toString(), workOrderId: expect.any(String), created: true },
    ]);
    expect(await WorkOrder.countDocuments()).toBe(1);
  });

  it('triggers meter PM work orders when usage thresholds are met', async () => {
    const meter = await Meter.create({
      asset: assetId,
      name: 'runHours',
      unit: 'hours',
      pmInterval: 50,
      currentValue: 10,
      lastWOValue: 0,
      tenantId,
    });

    await PMTask.create({
      title: 'Lubricate bearings',
      tenantId,
      asset: assetId,
      rule: { type: 'meter', meterName: meter.name, threshold: 50 },
      assignments: [],
      active: true,
    });

    const result = await ingestTelemetryBatch({
      tenantId: tenantId.toString(),
      readings: [
        { assetId, metric: 'runHours', value: 65, timestamp: new Date().toISOString() },
      ],
      triggerMeterPm: true,
    });

    expect(result.meterPmWorkOrders?.[0]).toMatchObject({
      pmTaskId: expect.any(String),
      meterId: meter._id.toString(),
      workOrderId: expect.any(String),
    });
    const wo = await WorkOrder.findById(result.meterPmWorkOrders?.[0].workOrderId);
    expect(wo?.pmTask?.toString()).toBe(result.meterPmWorkOrders?.[0].pmTaskId);
  });
});

