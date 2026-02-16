/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import notifyUser from '../utils/notify';
import User from '../models/User';
import Notification from '../models/Notification';

let mongo: MongoMemoryServer;
let userId: mongoose.Types.ObjectId;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  const user = await User.create({
    name: 'Test User',
    email: 'test@example.com',
    passwordHash: 'pass',
    roles: ['admin'],
    tenantId: new mongoose.Types.ObjectId(),
    employeeId: 'NOTIFY-EMP-001',
  });
  userId = user._id;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe('notifyUser', () => {
  it('creates a notification for the user', async () => {
    await notifyUser(userId, 'hello');
    const count = await Notification.countDocuments({ user: userId });
    expect(count).toBe(1);
  });
});
