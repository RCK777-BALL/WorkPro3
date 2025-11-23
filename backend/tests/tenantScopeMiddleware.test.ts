/*
 * SPDX-License-Identifier: MIT
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import tenantScope from '../middleware/tenantScope';
import Tenant from '../models/Tenant';
import Site from '../models/Site';

process.env.MONGOMS_OS = 'ubuntu2004';
process.env.MONGOMS_VERSION = '7.0.14';

describe('tenantScope middleware', () => {
  let mongo: MongoMemoryServer;
  const mongoVersion = '7.0.14';
  const systemBinary = process.env.MONGOMS_SYSTEM_BINARY || '/usr/bin/mongod';

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create({ binary: { version: mongoVersion, systemBinary } });
    await mongoose.connect(mongo.getUri());
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

  it('rejects requests missing tenant context', async () => {
    const app = express();
    app.use(express.json());
    app.use(tenantScope);
    app.get('/ctx', (_req, res) => res.json({ ok: true }));

    const res = await request(app).get('/ctx').expect(400);
    expect(res.body.message).toContain('Tenant ID is required');
  });

  it('applies tenant headers and creates a default site', async () => {
    const tenant = await Tenant.create({ name: 'Tenant Scope Test' });
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.user = { tenantId: tenant._id.toString() } as any;
      next();
    });
    app.use(tenantScope);
    app.get('/ctx', (req, res) => {
      res.json({ tenantId: req.tenantId, siteId: req.siteId });
    });

    const res = await request(app).get('/ctx').expect(200);
    expect(res.body.tenantId).toBe(tenant._id.toString());
    expect(res.headers['x-tenant-id']).toBe(tenant._id.toString());
    expect(res.body.siteId).toBeTruthy();

    const site = await Site.findById(res.body.siteId);
    expect(site?.tenantId?.toString()).toBe(tenant._id.toString());
  });

  it('blocks cross-tenant query parameters', async () => {
    const tenant = await Tenant.create({ name: 'Tenant Scope Test' });
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.user = { tenantId: tenant._id.toString() } as any;
      next();
    });
    app.use(tenantScope);
    app.get('/ctx', (_req, res) => res.json({ ok: true }));

    await request(app)
      .get('/ctx?tenantId=other-tenant')
      .set('x-tenant-id', tenant._id.toString())
      .expect(403);
  });
});
