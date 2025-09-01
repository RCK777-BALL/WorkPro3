import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Tenant from '../models/Tenant';

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

describe('Tenant model', () => {
  it('creates a tenant document', async () => {
    const tenant = await Tenant.create({ name: 'Acme Corp' });
    expect(tenant.name).toBe('Acme Corp');
    const count = await Tenant.countDocuments();
    expect(count).toBe(1);
  });
});
