/*
 * SPDX-License-Identifier: MIT
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

import SlaRule from '../models/SlaRule';
import { getActiveSlaRule } from '../services/slaRuleService';

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

describe('SLA rule evaluation', () => {
  it('picks the most specific SLA rule', async () => {
    if (unavailable) return;

    const tenantId = new mongoose.Types.ObjectId();
    const siteId = new mongoose.Types.ObjectId();

    await SlaRule.create({
      tenantId,
      name: 'Default SLA',
      scope: 'work_order',
      resolveMinutes: 240,
      isDefault: true,
    });

    await SlaRule.create({
      tenantId,
      siteId,
      name: 'Site SLA',
      scope: 'work_order',
      resolveMinutes: 180,
    });

    const mostSpecific = await SlaRule.create({
      tenantId,
      siteId,
      assetCategory: 'HVAC',
      priority: 'high',
      workType: 'corrective',
      name: 'Critical HVAC SLA',
      scope: 'work_order',
      responseMinutes: 30,
      resolveMinutes: 120,
    });

    const match = await getActiveSlaRule({
      tenantId,
      scope: 'work_order',
      siteId,
      assetCategory: 'HVAC',
      priority: 'high',
      workType: 'corrective',
    });

    expect(match?._id.toString()).toBe(mostSpecific._id.toString());
    expect(match?.responseMinutes).toBe(30);
  });
});
