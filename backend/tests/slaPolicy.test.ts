/*
 * SPDX-License-Identifier: MIT
 */

import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

import Asset from '../models/Asset';
import SlaPolicy from '../models/SlaPolicy';
import WorkOrder from '../models/WorkOrder';
import { applySlaPolicyToWorkOrder } from '../services/slaPolicyService';

let mongo: MongoMemoryServer | null = null;
let unavailable = false;

beforeAll(async () => {
  process.env.MONGOMS_VERSION = '6.0.5';
  try {
    mongo = await MongoMemoryServer.create({ binary: { version: process.env.MONGOMS_VERSION } });
    await mongoose.connect(mongo.getUri());
  } catch {
    unavailable = true;
  }
});

afterAll(async () => {
  if (mongo) {
    await mongoose.disconnect();
    await mongo.stop();
  }
});

describe('SLA policy selection', () => {
  it('applies the most specific site and category policy', async () => {
    if (unavailable) return;

    const tenantId = new mongoose.Types.ObjectId();
    const siteId = new mongoose.Types.ObjectId();
    const asset = await Asset.create({
      name: 'Pump 1',
      type: 'Mechanical',
      tenantId,
      plant: siteId,
    });

    await SlaPolicy.create({ tenantId, name: 'Default', resolveMinutes: 240 });
    const specific = await SlaPolicy.create({
      tenantId,
      siteId,
      assetCategory: 'Mechanical',
      name: 'Mechanical site',
      responseMinutes: 15,
      resolveMinutes: 120,
    });

    const order = new WorkOrder({
      title: 'Order with policy',
      tenantId,
      plant: siteId,
      siteId,
      assetId: asset._id,
      timeline: [],
    });

    const before = Date.now();
    await applySlaPolicyToWorkOrder(order);
    const after = Date.now();

    expect(order.slaPolicyId?.toString()).toBe(specific._id.toString());
    expect(order.slaResponseDueAt?.getTime()).toBeGreaterThanOrEqual(before + 14 * 60 * 1000);
    expect(order.slaResponseDueAt?.getTime()).toBeLessThanOrEqual(after + 16 * 60 * 1000);
    expect(order.slaResolveDueAt).toBeDefined();
  });
});
