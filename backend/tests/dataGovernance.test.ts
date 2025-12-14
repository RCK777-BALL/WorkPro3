/*
 * SPDX-License-Identifier: MIT
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import Tenant from '../models/Tenant';
import TenantDataPolicy from '../models/TenantDataPolicy';
import {
  auditAuthenticationEvent,
  auditConfigurationChange,
  auditDataAccessEvent,
  buildSearchScope,
  enforcePartitionBoundary,
  listAuditLogsForAdmin,
  updateTenantResidencyAndRetention,
} from '../src/modules/data-governance/service';

process.env.MONGOMS_OS = 'ubuntu2004';
process.env.MONGOMS_VERSION = '7.0.14';

describe('data governance service', () => {
  let mongo: MongoMemoryServer;
  const mongoVersion = '7.0.14';
  const systemBinary = process.env.MONGOMS_SYSTEM_BINARY || '/usr/bin/mongod';

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create({ binary: { version: mongoVersion, systemBinary } });
    await mongoose.connect(mongo.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  beforeEach(async () => {
    await mongoose.connection.db?.dropDatabase();
  });

  it('enforces tenant and site partition boundaries while allowing rollups when permitted', async () => {
    const tenantId = new Types.ObjectId();
    const siteId = new Types.ObjectId();

    await TenantDataPolicy.create({ tenantId, allowCrossSiteRollups: true, residency: { region: 'us-east' } });

    const sameSite = await enforcePartitionBoundary(
      { tenantId, siteId },
      { tenantId, siteId },
    );
    expect(sameSite.tenantId.toString()).toBe(tenantId.toString());
    expect(sameSite.siteId?.toString()).toBe(siteId.toString());
    expect(sameSite.rollup).toBe(false);

    const rollup = await enforcePartitionBoundary({ tenantId, siteId }, { tenantId, rollup: true });
    expect(rollup.rollup).toBe(true);
    expect(rollup.siteId).toBeUndefined();

    await expect(
      enforcePartitionBoundary({ tenantId, siteId }, { tenantId: new Types.ObjectId() }),
    ).rejects.toThrow(/Cross-tenant/);
  });

  it('builds global search scopes only when tenant policy permits it', async () => {
    const primaryTenant = new Types.ObjectId();
    const siblingTenant = new Types.ObjectId();

    await TenantDataPolicy.create({
      tenantId: primaryTenant,
      residency: { region: 'eu-west' },
      allowGlobalSearch: true,
      allowCrossSiteRollups: false,
    });

    const scoped = await buildSearchScope({ tenantId: primaryTenant, allowGlobalSearch: true }, [
      primaryTenant,
      siblingTenant,
    ]);
    expect(scoped.allowGlobal).toBe(true);
    expect(scoped.tenantIds.map((id) => id.toString())).toEqual(
      expect.arrayContaining([primaryTenant.toString(), siblingTenant.toString()]),
    );

    const isolated = await buildSearchScope({ tenantId: primaryTenant, allowGlobalSearch: false }, [
      primaryTenant,
      siblingTenant,
    ]);
    expect(isolated.allowGlobal).toBe(false);
    expect(isolated.tenantIds).toHaveLength(1);
    expect(isolated.tenantIds[0].toString()).toBe(primaryTenant.toString());
  });

  it('records audit events for auth, configuration, and data access with tenant retention applied', async () => {
    const tenant = await Tenant.create({ name: 'Audit Tenant' });
    const userId = new Types.ObjectId();

    await updateTenantResidencyAndRetention(tenant._id, {
      residencyRegion: 'ap-south',
      retentionDays: 1,
      allowGlobalSearch: true,
      allowCrossSiteRollups: true,
      updatedBy: userId,
    });

    await auditAuthenticationEvent({ tenantId: tenant._id, userId, outcome: 'success' });
    await auditConfigurationChange({ tenantId: tenant._id, userId, entityType: 'config', after: { flag: true } });
    await auditDataAccessEvent({ tenantId: tenant._id, userId, entityType: 'document', description: 'report download' });

    const logs = await listAuditLogsForAdmin(tenant._id, { limit: 10 });
    expect(logs).toHaveLength(3);
    const actions = logs.map((log) => log.action).sort();
    expect(actions).toEqual(['auth.success', 'config.change', 'data.access']);

    logs.forEach((log) => {
      expect(log.tenantId.toString()).toBe(tenant._id.toString());
      expect(log.expiresAt).toBeInstanceOf(Date);
      expect(log.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    const policy = await TenantDataPolicy.findOne({ tenantId: tenant._id }).lean();
    expect(policy?.residency?.region).toBe('ap-south');
    expect(policy?.retentionDays?.audit).toBe(1);
  });
});
