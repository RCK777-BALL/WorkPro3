/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import tenantScope from '../middleware/tenantScope';
import Tenant from '../models/Tenant';
import Site from '../models/Site';

const app = express();
app.use(express.json());
app.get('/context', tenantScope, (req, res) => {
  res.json({ tenantId: req.tenantId, siteId: req.siteId });
});

let mongo: MongoMemoryServer | null;
let mongoUnavailable = false;
const defaultTenantId = new mongoose.Types.ObjectId();

beforeAll(async () => {
  process.env.DEFAULT_TENANT_ID = defaultTenantId.toString();
  process.env.MONGOMS_VERSION = '7.0.3';
  try {
    mongo = await MongoMemoryServer.create({ binary: { version: process.env.MONGOMS_VERSION } });
    await mongoose.connect(mongo.getUri());
  } catch (error) {
    mongoUnavailable = true;
    console.warn('Skipping tenant scope tests due to MongoDB binary download failure', error);
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) {
    await mongo.stop();
  }
});

beforeEach(async () => {
  await mongoose.connection.db?.dropDatabase();
});

describe('tenantScope header resolution', () => {
  it('uses provided tenant and site headers when present', async () => {
    if (mongoUnavailable) return;
    const tenantId = new mongoose.Types.ObjectId();
    const siteId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .get('/context')
      .set('x-tenant-id', tenantId.toString())
      .set('x-site-id', siteId.toString())
      .expect(200);

    expect(res.headers['x-tenant-id']).toBe(tenantId.toString());
    expect(res.body.tenantId).toBe(tenantId.toString());
    expect(res.body.siteId).toBe(siteId.toString());
  });

  it('creates a site when only tenant context is available', async () => {
    if (mongoUnavailable) return;
    const tenant = await Tenant.create({ _id: defaultTenantId, name: 'Backfill Tenant' });

    const res = await request(app).get('/context').expect(200);

    expect(res.body.tenantId).toBe(defaultTenantId.toString());
    const resolvedSiteId = res.body.siteId as string;
    expect(resolvedSiteId).toBeTruthy();

    const site = await Site.findById(resolvedSiteId).lean();
    expect(site?.tenantId?.toString()).toBe(tenant._id.toString());
  });
});
