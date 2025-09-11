/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import Asset from '../../models/Asset';
import SensorReading from '../../models/SensorReading';
import Prediction from '../../models/Prediction';
import predictiveService from '../../utils/predictiveService';

let mongo: MongoMemoryServer;
let tenantId: mongoose.Types.ObjectId;
let assetId: mongoose.Types.ObjectId;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  tenantId = new mongoose.Types.ObjectId();
  const asset = await Asset.create({
    name: 'TestAsset',
    type: 'Mechanical',
    location: 'Loc',
    tenantId,
  });
  assetId = asset._id as mongoose.Types.ObjectId;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await mongoose.connection.db.dropDatabase();
  await Asset.create({
    _id: assetId,
    name: 'TestAsset',
    type: 'Mechanical',
    location: 'Loc',
    tenantId,
  });
  await SensorReading.create([
    { asset: assetId, metric: 'temp', value: 10, tenantId },
    { asset: assetId, metric: 'temp', value: 20, tenantId },
    { asset: assetId, metric: 'temp', value: 30, tenantId },
    { asset: assetId, metric: 'temp', value: 40, tenantId },
  ]);
});

describe('Predictive models accuracy', () => {
  it('linear model predicts within threshold', async () => {
    process.env.PREDICTIVE_MODEL = 'linear';
    const results = await predictiveService.predictForAsset(
      assetId.toString(),
      tenantId.toString()
    );
    expect(results.length).toBeGreaterThan(0);
    expect(Math.abs(results[0].predictedValue - 50)).toBeLessThan(5);
  });

  it('arima model predicts within threshold', async () => {
    process.env.PREDICTIVE_MODEL = 'arima';
    const results = await predictiveService.predictForAsset(
      assetId.toString(),
      tenantId.toString()
    );
    expect(results.length).toBeGreaterThan(0);
    expect(Math.abs(results[0].predictedValue - 50)).toBeLessThan(5);
  });

  it('stores prediction with confidence interval', async () => {
    process.env.PREDICTIVE_MODEL = 'linear';
    await predictiveService.predictForAsset(assetId.toString(), tenantId.toString());
    const stored = await Prediction.find({ asset: assetId });
    expect(stored.length).toBeGreaterThan(0);
    expect(stored[0].lowerBound).not.toBeUndefined();
    expect(stored[0].upperBound).not.toBeUndefined();
  });
});
