/*
 * SPDX-License-Identifier: MIT
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import AuditEvent from '../models/AuditEvent';
import AuditLog from '../models/AuditLog';
import { writeAuditLog } from '../utils/audit';

process.env.MONGOMS_OS = 'ubuntu2004';
process.env.MONGOMS_VERSION = '7.0.14';

describe('writeAuditLog', () => {
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

  it('records audit events with tenant and site context', async () => {
    const tenantId = new mongoose.Types.ObjectId();
    const siteId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();

    await writeAuditLog({
      tenantId,
      siteId,
      userId,
      action: 'update',
      entityType: 'Asset',
      entityId: 'asset-1',
      before: { name: 'Old' },
      after: { name: 'New' },
    });

    const log = await AuditLog.findOne({ tenantId }).lean();
    const event = await AuditEvent.findOne({ tenantId }).lean();
    expect(log?.tenantId?.toString()).toBe(tenantId.toString());
    expect(log?.siteId?.toString()).toBe(siteId.toString());
    expect(log?.userId?.toString()).toBe(userId.toString());
    expect(log?.diff?.[0]?.path).toBe('name');
    expect(event?.action).toBe('update');
    expect(event?.details).toMatchObject({
      entityType: 'Asset',
      entityId: 'asset-1',
    });
  });
});
