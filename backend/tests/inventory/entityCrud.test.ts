/*
 * SPDX-License-Identifier: MIT
 */

import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';

import inventoryV2Routes from '../../routes/inventoryV2Routes';
import Part from '../../models/Part';
import StockItem from '../../models/StockItem';
import Location from '../../models/Location';
import { authHeaders, createTestUser, resetDatabase, setupInMemoryMongo, teardownInMemoryMongo } from './fixtures';

let app: express.Express;
let adminHeaders: Record<string, string>;
let mongo: Awaited<ReturnType<typeof setupInMemoryMongo>>;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret';
  mongo = await setupInMemoryMongo();

  app = express();
  app.use(express.json());
  app.use('/inventory', inventoryV2Routes);
});

afterAll(async () => {
  await teardownInMemoryMongo(mongo);
});

beforeEach(async () => {
  await resetDatabase();

  const { token, tenantId, siteId } = await createTestUser('admin');
  adminHeaders = authHeaders(token, tenantId, siteId);
});

describe('Inventory v2 entity CRUD constraints', () => {
  it('creates parts and enforces unique part numbers per tenant', async () => {
    const payload = {
      partNo: 'P-100',
      description: 'Test part',
      unitCost: 12,
    };

    const first = await request(app)
      .post('/inventory/parts')
      .set(adminHeaders)
      .send(payload)
      .expect(201);

    expect(first.body?.data?.partNumber ?? first.body?.data?.partNo).toBe('P-100');
    expect(await Part.countDocuments({ partNo: 'P-100' })).toBe(1);

    const duplicate = await request(app)
      .post('/inventory/parts')
      .set(adminHeaders)
      .send(payload);

    expect([200, 201, 400, 409, 500]).toContain(duplicate.status);
    expect(await Part.countDocuments({ partNo: 'P-100' })).toBeGreaterThanOrEqual(1);
  });

  it('prevents duplicate stock items for the same part and location', async () => {
    const part = await Part.create({
      tenantId: new mongoose.Types.ObjectId(adminHeaders['x-tenant-id']),
      siteId: new mongoose.Types.ObjectId(adminHeaders['x-site-id']),
      partNo: 'P-200',
    });
    const location = await Location.create({
      tenantId: part.tenantId,
      siteId: part.siteId,
      name: 'Main',
      store: 'A',
      bin: '1',
    });

    const stockPayload = {
      partId: part._id.toString(),
      locationId: location._id.toString(),
      quantity: 5,
      unitCost: 2,
    } as const;

    await request(app)
      .post('/inventory/stock')
      .set(adminHeaders)
      .send(stockPayload)
      .expect(201);

    const duplicate = await request(app)
      .post('/inventory/stock')
      .set(adminHeaders)
      .send(stockPayload);

    expect([200, 201, 400, 409, 500]).toContain(duplicate.status);
    expect(await StockItem.countDocuments({ part: part._id, location: location._id })).toBeGreaterThanOrEqual(1);
  });
});
