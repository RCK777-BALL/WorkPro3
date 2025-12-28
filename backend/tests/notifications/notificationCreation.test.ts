import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import NotificationDeliveryLog from '../../models/NotificationDeliveryLog';
import NotificationSubscription from '../../models/NotificationSubscription';
import User from '../../models/User';
import { castFixture } from '../testUtils';
import { createNotification } from '../../services/notificationService';

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
  userId = castFixture(user)._id;
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

describe('notification creation', () => {
  it('tracks delivery logs for push channel subscriptions', async () => {
    await NotificationSubscription.create({
      tenantId,
      userId,
      events: ['updated'],
      channels: ['push'],
    });

    const notification = await createNotification({
      tenantId,
      userId,
      category: 'updated',
      title: 'Status update',
      message: 'Work order updated',
      channels: { pushToken: 'push-token-1' },
    });

    const logs = await NotificationDeliveryLog.find({ notificationId: notification._id });
    expect(logs).toHaveLength(1);
    expect(logs[0].channel).toBe('push');
    expect(logs[0].status).toBe('sent');
    expect(logs[0].event).toBe('updated');
    expect(notification.deliveryState).toBe('sent');
  });
});
