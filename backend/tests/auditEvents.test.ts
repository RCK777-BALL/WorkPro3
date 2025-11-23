/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import AuditEvent from '../models/AuditEvent';
import AuditLog from '../models/AuditLog';
import { writeAuditLog } from '../utils/audit';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe('AuditEvent immutability', () => {
  it('prevents update and delete', async () => {
    const event = await AuditEvent.create({ tenantId: new mongoose.Types.ObjectId(), action: 'login' });

    await expect(
      AuditEvent.updateOne({ _id: event._id }, { action: 'changed' })
    ).rejects.toThrow('AuditEvent is immutable');

    await expect(
      AuditEvent.deleteOne({ _id: event._id })
    ).rejects.toThrow('AuditEvent is immutable');
  });

  it('records tenant and site information on audit log entries', async () => {
    const tenantId = new mongoose.Types.ObjectId();
    const siteId = new mongoose.Types.ObjectId();

    await writeAuditLog({
      tenantId,
      siteId,
      userId: new mongoose.Types.ObjectId(),
      action: 'update',
      entityType: 'asset',
      entityId: 'asset-123',
      before: { name: 'old' },
      after: { name: 'new' },
    });

    const record = await AuditLog.findOne({ tenantId, entityType: 'asset' }).lean();

    expect(record).toBeTruthy();
    expect(record?.tenantId?.toString()).toBe(tenantId.toString());
    expect(record?.siteId?.toString()).toBe(siteId.toString());
    expect(record?.entityType).toBe('asset');
    expect(record?.action).toBe('update');
  });
});
