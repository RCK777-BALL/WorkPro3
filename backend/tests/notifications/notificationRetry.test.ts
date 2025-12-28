import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import Notification from '../../models/Notification';
import NotificationDeliveryLog from '../../models/NotificationDeliveryLog';
import User from '../../models/User';
import { retryFailedDeliveries } from '../../src/modules/notifications/service';

let mongo: MongoMemoryServer;
let tenantId: mongoose.Types.ObjectId;
let userId: mongoose.Types.ObjectId;

beforeAll(async () => {
  process.env.MONGOMS_VERSION = '7.0.14';
  mongo = await MongoMemoryServer.create({ binary: { version: process.env.MONGOMS_VERSION } });
  await mongoose.connect(mongo.getUri());
  tenantId = new mongoose.Types.ObjectId();
  const user = await User.create({
    name: 'Tester',
    email: 'tester@example.com',
    passwordHash: 'pass',
    tenantId,
    roles: ['admin'],
    employeeId: 'T1',
  });
  userId = user._id;
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) {
    await mongo.stop();
  }
});

beforeEach(async () => {
  await mongoose.connection.db?.dropDatabase();
  await User.create({
    _id: userId,
    name: 'Tester',
    email: 'tester@example.com',
    passwordHash: 'pass',
    tenantId,
    roles: ['admin'],
    employeeId: 'T1',
  });
});

describe('notification delivery retry', () => {
  it('retries failed deliveries and updates delivery state', async () => {
    const notification = await Notification.create({
      tenantId,
      user: userId,
      title: 'Retry me',
      message: 'Push notification',
      type: 'info',
      category: 'updated',
      deliveryState: 'queued',
    });

    await NotificationDeliveryLog.create({
      notificationId: notification._id,
      tenantId,
      channel: 'push',
      attempt: 1,
      status: 'failed',
      event: 'updated',
      target: 'push-token',
      createdAt: new Date(Date.now() - 10 * 60 * 1000),
    });

    await retryFailedDeliveries(new Date());

    const logs = await NotificationDeliveryLog.find({ notificationId: notification._id, status: 'sent' });
    expect(logs).toHaveLength(1);
    expect(logs[0].attempt).toBe(2);

    const updated = await Notification.findById(notification._id);
    expect(updated?.deliveryState).toBe('sent');
  });
});
