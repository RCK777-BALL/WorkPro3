import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';

import User from '../../models/User';
import type { UserDocument } from '../../models/User';

export interface TestUser {
  user: UserDocument;
  token: string;
  tenantId: mongoose.Types.ObjectId;
  siteId: mongoose.Types.ObjectId;
}

export async function setupInMemoryMongo() {
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  return mongo;
}

export async function teardownInMemoryMongo(mongo: MongoMemoryServer) {
  await mongoose.disconnect();
  await mongo.stop();
}

export async function resetDatabase() {
  const db = mongoose.connection.db;
  if (db) {
    await db.dropDatabase();
  }
}

export async function createTestUser(
  role: string,
  tenantId: mongoose.Types.ObjectId = new mongoose.Types.ObjectId(),
  siteId: mongoose.Types.ObjectId = new mongoose.Types.ObjectId(),
): Promise<TestUser> {
  const user = await User.create({
    name: `${role}-user`,
    email: `${role}-${tenantId.toString()}@example.com`,
    passwordHash: 'hash',
    roles: [role as any],
    tenantId,
    siteId,
    employeeId: `${role}-${Date.now()}`,
  });

  const token = jwt.sign(
    { id: user._id.toString(), tenantId: tenantId.toString(), siteId: siteId.toString(), roles: [role] },
    process.env.JWT_SECRET ?? 'secret',
  );

  return { user, token, tenantId, siteId };
}

export const authHeaders = (token: string, tenantId: mongoose.Types.ObjectId, siteId?: mongoose.Types.ObjectId) => ({
  Authorization: `Bearer ${token}`,
  'x-tenant-id': tenantId.toString(),
  ...(siteId ? { 'x-site-id': siteId.toString() } : {}),
});
