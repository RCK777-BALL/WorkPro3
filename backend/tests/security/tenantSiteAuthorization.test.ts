/*
 * SPDX-License-Identifier: MIT
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import tenantScope from '../../middleware/tenantScope';
import authorizeTenantSite from '../../src/middleware/tenantAuthorization';
import Tenant from '../../models/Tenant';
import Site from '../../models/Site';

process.env.MONGOMS_OS = 'ubuntu2004';
process.env.MONGOMS_VERSION = '7.0.14';

describe('authorizeTenantSite middleware', () => {
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

  it('rejects cross-tenant site headers', async () => {
    const tenantA = await Tenant.create({ name: 'Tenant A' });
    const tenantB = await Tenant.create({ name: 'Tenant B' });
    const siteB = await Site.create({ tenantId: tenantB._id, name: 'Tenant B Site' });

    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.user = { tenantId: tenantA._id.toString() } as any;
      next();
    });
    app.use(tenantScope);
    app.use(authorizeTenantSite());
    app.get('/ctx', (_req, res) => res.json({ ok: true }));

    const res = await request(app)
      .get('/ctx')
      .set('x-tenant-id', tenantA._id.toString())
      .set('x-site-id', siteB._id.toString())
      .expect(403);

    expect(res.body.message).toContain('Site does not belong to tenant');
  });

  it('rejects mismatched tenant route params', async () => {
    const tenantA = await Tenant.create({ name: 'Tenant A' });
    const tenantB = await Tenant.create({ name: 'Tenant B' });
    await Site.create({ tenantId: tenantA._id, name: 'Tenant A Site' });

    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.user = { tenantId: tenantA._id.toString() } as any;
      next();
    });
    app.use(tenantScope);
    app.use(authorizeTenantSite());
    app.post('/tenants/check', (_req, res) => res.json({ ok: true }));

    await request(app)
      .post('/tenants/check')
      .set('x-tenant-id', tenantA._id.toString())
      .send({ tenantId: tenantB._id.toString() })
      .expect(403);
  });

  it('allows tenant and site scoped access', async () => {
    const tenant = await Tenant.create({ name: 'Tenant A' });
    const site = await Site.create({ tenantId: tenant._id, name: 'Tenant A Site' });

    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.user = { tenantId: tenant._id.toString(), siteId: site._id.toString() } as any;
      next();
    });
    app.use(tenantScope);
    app.use(authorizeTenantSite());
    app.get('/ctx', (req, res) => res.json({ tenantId: req.tenantId, siteId: req.siteId }));

    const res = await request(app)
      .get('/ctx')
      .set('x-tenant-id', tenant._id.toString())
      .set('x-site-id', site._id.toString())
      .expect(200);

    expect(res.body.tenantId).toBe(tenant._id.toString());
    expect(res.body.siteId).toBe(site._id.toString());
  });
});
