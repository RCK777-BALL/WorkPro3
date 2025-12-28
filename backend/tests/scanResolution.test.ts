/*
 * SPDX-License-Identifier: MIT
 */

import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';

import assetRouter from '../src/modules/assets';
import inventoryRouter from '../src/modules/inventory';
import scanHistoryRouter from '../src/modules/scan-history';
import Asset from '../models/Asset';
import ScanHistory from '../models/ScanHistory';
import AuditLog from '../models/AuditLog';
import PartModel from '../src/modules/inventory/models/Part';
import { generateQrCodeValue } from '../services/qrCode';
import { authHeaders, createTestUser, resetDatabase, setupInMemoryMongo, teardownInMemoryMongo } from './inventory/fixtures';

let app: express.Express;
let headers: Record<string, string>;
let tenantId: mongoose.Types.ObjectId;
let siteId: mongoose.Types.ObjectId;
let mongo: Awaited<ReturnType<typeof setupInMemoryMongo>>;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret';
  mongo = await setupInMemoryMongo();

  app = express();
  app.use(express.json());
  app.use('/assets', assetRouter);
  app.use('/inventory', inventoryRouter);
  app.use('/scan-history', scanHistoryRouter);
});

afterAll(async () => {
  await teardownInMemoryMongo(mongo);
});

beforeEach(async () => {
  await resetDatabase();
  const admin = await createTestUser('admin');
  tenantId = admin.tenantId;
  siteId = admin.siteId;
  headers = authHeaders(admin.token, tenantId, siteId);
});

describe('Scan resolution and history', () => {
  it('resolves assets by QR payloads', async () => {
    const asset = await Asset.create({
      name: 'Pump Station A',
      type: 'Mechanical',
      tenantId,
      plant: siteId,
      siteId,
    });

    const qrValue = generateQrCodeValue({ type: 'asset', id: asset._id.toString(), tenantId: tenantId.toString() });
    asset.qrCode = qrValue;
    await asset.save();

    const res = await request(app)
      .get('/assets/scan/resolve')
      .set(headers)
      .query({ value: qrValue })
      .expect(200);

    expect(res.body.data.id).toBe(asset._id.toString());
    expect(res.body.data.name).toBe('Pump Station A');
  });

  it('resolves parts by barcode', async () => {
    const part = await PartModel.create({
      tenantId,
      siteId,
      name: 'Bearing',
      barcode: 'BAR-1234',
      reorderPoint: 1,
      quantity: 5,
    });

    const res = await request(app)
      .get('/inventory/scan/resolve')
      .set(headers)
      .query({ value: 'BAR-1234' })
      .expect(200);

    expect(res.body.data.id).toBe(part._id.toString());
    expect(res.body.data.name).toBe('Bearing');
  });

  it('records scan history and audit logs', async () => {
    const scanPayload = {
      rawValue: 'asset:QA-44',
      outcome: 'success',
      source: 'test-suite',
      resolution: {
        type: 'asset',
        id: new mongoose.Types.ObjectId().toString(),
        path: '/assets/QA-44',
      },
    } as const;

    await request(app)
      .post('/scan-history')
      .set(headers)
      .set('User-Agent', 'Vitest')
      .send(scanPayload)
      .expect(201);

    const history = await ScanHistory.findOne({ tenantId }).lean();
    expect(history?.rawValue).toBe('asset:QA-44');
    expect(history?.source).toBe('test-suite');

    const audit = await AuditLog.findOne({ entityType: 'scan_history' }).lean();
    expect(audit?.action).toBe('scan_history.create');
    expect(audit?.entityId).toBe(history?._id.toString());
  });
});
