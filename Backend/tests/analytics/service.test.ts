/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { getKPIs, getTrendDatasets } from '../../services/analytics';
import Site from '../../models/Site';
import Asset from '../../models/Asset';
import WorkOrder from '../../models/WorkOrder';
import ProductionRecord from '../../models/ProductionRecord';
import SensorReading from '../../models/SensorReading';

let mongo: MongoMemoryServer;
let tenantId: mongoose.Types.ObjectId;
let siteId: mongoose.Types.ObjectId;
let assetId: mongoose.Types.ObjectId;

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
  tenantId = new mongoose.Types.ObjectId();
  const site = await Site.create({ name: 'Main Plant', tenantId });
  siteId = site._id as mongoose.Types.ObjectId;
  const asset = await Asset.create({
    name: 'Cutter 01',
    type: 'Mechanical',
    location: 'Line 1',
    tenantId,
    siteId,
    status: 'Active',
  });
  assetId = asset._id as mongoose.Types.ObjectId;

  await WorkOrder.create([
    {
      title: 'Breakdown 1',
      tenantId,
      assetId,
      status: 'completed',
      createdAt: new Date('2023-01-01T08:00:00Z'),
      completedAt: new Date('2023-01-01T10:00:00Z'),
      timeSpentMin: 120,
      failureCode: 'mechanical',
    },
    {
      title: 'Breakdown 2',
      tenantId,
      assetId,
      status: 'completed',
      createdAt: new Date('2023-01-02T13:00:00Z'),
      completedAt: new Date('2023-01-02T14:00:00Z'),
      timeSpentMin: 60,
      failureCode: 'electrical',
    },
  ]);

  await ProductionRecord.create([
    {
      tenantId,
      asset: assetId,
      site: siteId,
      recordedAt: new Date('2023-01-01T23:00:00Z'),
      plannedUnits: 1000,
      actualUnits: 900,
      goodUnits: 870,
      idealCycleTimeSec: 30,
      plannedTimeMinutes: 600,
      runTimeMinutes: 540,
      downtimeMinutes: 60,
      downtimeReason: 'setup',
      energyConsumedKwh: 10,
    },
    {
      tenantId,
      asset: assetId,
      site: siteId,
      recordedAt: new Date('2023-01-02T23:00:00Z'),
      plannedUnits: 1100,
      actualUnits: 950,
      goodUnits: 930,
      idealCycleTimeSec: 30,
      plannedTimeMinutes: 600,
      runTimeMinutes: 570,
      downtimeMinutes: 30,
      downtimeReason: 'changeover',
      energyConsumedKwh: 12,
    },
  ]);

  await SensorReading.create([
    {
      tenantId,
      asset: assetId,
      metric: 'energy_kwh',
      value: 50,
      timestamp: new Date('2023-01-01T12:00:00Z'),
    },
    {
      tenantId,
      asset: assetId,
      metric: 'energy_kwh',
      value: 55,
      timestamp: new Date('2023-01-02T12:00:00Z'),
    },
  ]);
});

describe('Analytics service', () => {
  it('computes KPI aggregates across production, sensors and work orders', async () => {
    const filters = {
      startDate: new Date('2023-01-01T00:00:00Z'),
      endDate: new Date('2023-01-03T00:00:00Z'),
    };
    const result = await getKPIs(tenantId.toHexString(), filters);
    expect(result.mttr).toBeGreaterThan(0);
    expect(result.mtbf).toBeGreaterThan(0);
    expect(result.backlog).toBe(0);
    expect(result.availability).toBeCloseTo(1110 / 1200, 4);
    expect(result.performance).toBeCloseTo(0.833, 2);
    expect(result.quality).toBeCloseTo(1800 / 1850, 4);
    expect(result.oee).toBeCloseTo(result.availability * result.performance * result.quality, 4);
    expect(result.energy.totalKwh).toBeCloseTo(50 + 55 + 10 + 12, 4);
    expect(result.energy.perAsset[0].totalKwh).toBeCloseTo(result.energy.totalKwh, 4);
    expect(result.downtime.totalMinutes).toBe(180);
    expect(result.downtime.reasons).toEqual([
      { reason: 'mechanical', minutes: 120 },
      { reason: 'electrical', minutes: 60 },
    ]);
    expect(result.benchmarks.assets[0].name).toBe('Cutter 01');
    expect(result.benchmarks.sites[0].name).toBe('Main Plant');
    expect(result.thresholds.availability).toBeGreaterThan(0);
    expect(result.range.start).toBe(filters.startDate.toISOString());
  });

  it('produces aligned trend datasets', async () => {
    const filters = {
      startDate: new Date('2023-01-01T00:00:00Z'),
      endDate: new Date('2023-01-03T00:00:00Z'),
    };
    const trends = await getTrendDatasets(tenantId.toHexString(), filters);
    expect(trends.oee).toHaveLength(2);
    expect(trends.energy).toEqual([
      { period: '2023-01-01', value: 50 },
      { period: '2023-01-02', value: 55 },
    ]);
    expect(trends.downtime).toEqual([
      { period: '2023-01-01', value: 120 },
      { period: '2023-01-02', value: 60 },
    ]);
    expect(trends.availability[0].period).toBe('2023-01-01');
    expect(trends.performance[1].value).toBeGreaterThan(0);
  });
});
