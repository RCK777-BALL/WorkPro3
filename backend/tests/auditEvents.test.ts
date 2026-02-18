/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import AuditEvent from '../models/AuditEvent';

let mongo: MongoMemoryServer | null;
let mongoUnavailable = false;

beforeAll(async () => {
  process.env.MONGOMS_VERSION = '7.0.3';
  try {
    mongo = await MongoMemoryServer.create({ binary: { version: process.env.MONGOMS_VERSION } });
    await mongoose.connect(mongo.getUri());
  } catch (error) {
    mongoUnavailable = true;
    console.warn('Skipping audit event tests due to MongoDB binary download failure', error);
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) {
    await mongo.stop();
  }
});

describe('AuditEvent immutability', () => {
  it('prevents update and delete', async () => {
    if (mongoUnavailable) return;
    const event = await AuditEvent.create({ tenantId: new mongoose.Types.ObjectId(), action: 'login' });

    await expect(
      AuditEvent.updateOne({ _id: event._id }, { action: 'changed' })
    ).rejects.toThrow('AuditEvent is immutable');

    await expect(
      AuditEvent.deleteOne({ _id: event._id })
    ).rejects.toThrow('AuditEvent is immutable');
  });

  it('captures site context when provided', async () => {
    if (mongoUnavailable) return;
    const tenantId = new mongoose.Types.ObjectId();
    const siteId = new mongoose.Types.ObjectId();
    const event = await AuditEvent.create({ tenantId, siteId, action: 'login' });

    expect(event.tenantId.toString()).toBe(tenantId.toString());
    expect(event.siteId?.toString()).toBe(siteId.toString());
  });
});
