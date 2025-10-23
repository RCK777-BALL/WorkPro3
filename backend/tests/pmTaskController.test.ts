/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Request, Response } from 'express';

import { generatePMWorkOrders } from '../controllers/PMTaskController';
import PMTask from '../models/PMTask';
import WorkOrder from '../models/WorkOrder';

let mongo: MongoMemoryServer;

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
});

describe('generatePMWorkOrders', () => {
  it('creates preventive work orders with a requested status', async () => {
    const tenantId = new mongoose.Types.ObjectId();
    const assetId = new mongoose.Types.ObjectId();

    await PMTask.create({
      title: 'Test PM Task',
      tenantId,
      asset: assetId,
      notes: 'Check asset condition',
      rule: { type: 'calendar', cron: '0 0 * * *' },
      active: true,
    });

    const status = vi.fn().mockReturnThis();
    const json = vi.fn();
    const res = { status, json } as unknown as Response;

    await generatePMWorkOrders(
      { tenantId } as unknown as Request,
      res,
      vi.fn(),
    );

    const saved = await WorkOrder.findOne({ tenantId });
    expect(saved).not.toBeNull();
    expect(saved?.status).toBe('requested');
    expect(saved?.type).toBe('preventive');
    expect(saved?.assetId?.toString()).toBe(assetId.toString());
  });
});
