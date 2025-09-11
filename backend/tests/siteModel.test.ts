/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Tenant from '../models/Tenant';
import Site from '../models/Site';

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

describe('Site creation limits', () => {
  it('prevents creating more sites than allowed', async () => {
    const tenant = await Tenant.create({ name: 'T1', maxSites: 1 });
    await Site.create({ name: 'Main', tenantId: tenant._id });
    await expect(Site.create({ name: 'Extra', tenantId: tenant._id })).rejects.toThrow(
      /Site limit reached/
    );
  });
});
