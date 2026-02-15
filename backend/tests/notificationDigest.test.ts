import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import NotificationSubscription from '../models/NotificationSubscription';
import NotificationDeliveryLog from '../models/NotificationDeliveryLog';
import NotificationDigestQueue from '../models/NotificationDigestQueue';
import NotificationTemplate from '../models/NotificationTemplate';
import User from '../models/User';
import { castFixture } from './testUtils';
import { createNotification, isWithinQuietHours, processPendingDigests } from '../services/notificationService';

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

describe('Notification quiet hours and digests', () => {
  it('detects quiet hours correctly', () => {
    const now = new Date(2024, 0, 1, 22, 30, 0);
    expect(isWithinQuietHours({ start: '21:00', end: '23:00' }, now)).toBe(true);
    expect(isWithinQuietHours({ start: '23:00', end: '05:00' }, new Date(2024, 0, 2, 1, 0, 0))).toBe(true);
    expect(isWithinQuietHours({ start: '23:00', end: '05:00' }, new Date(2024, 0, 2, 12, 0, 0))).toBe(false);
  });

  it('defers deliveries during quiet hours and processes digests later', async () => {
    const subscription = await NotificationSubscription.create({
      tenantId,
      userId,
      events: ['assigned'],
      channels: ['email', 'in_app'],
      quietHours: { start: '00:00', end: '23:59' },
      digest: { enabled: true, frequency: 'hourly' },
    });
    await NotificationTemplate.create({
      tenantId,
      event: 'assigned',
      channel: 'email',
      subject: 'Assigned!',
      body: 'Template body {{name}}',
    });

    await createNotification({
      tenantId,
      userId,
      category: 'assigned',
      title: 'Assignment',
      message: 'Work assigned',
      type: 'info',
      event: 'assigned',
      templateContext: { name: 'Tester' },
    });

    const deferredLogs = await NotificationDeliveryLog.find({ subscriptionId: subscription._id, status: 'deferred' });
    expect(deferredLogs).toHaveLength(2);

    const digestRecord = await NotificationDigestQueue.findOne({ subscriptionId: subscription._id });
    expect(digestRecord?.notificationIds.length).toBe(1);

    await processPendingDigests(new Date(Date.now() + 2 * 60 * 60 * 1000));

    const remainingQueue = await NotificationDigestQueue.countDocuments({ subscriptionId: subscription._id });
    expect(remainingQueue).toBe(0);

    const deliveryLogs = await NotificationDeliveryLog.find({ subscriptionId: subscription._id });
    expect(deliveryLogs.some((log) => log.channel === 'in_app')).toBe(true);
  });

  it('logs queued deliveries when digest is disabled during quiet hours', async () => {
    const subscription = await NotificationSubscription.create({
      tenantId,
      userId,
      events: ['updated'],
      channels: ['in_app'],
      quietHours: { start: '00:00', end: '23:59' },
      digest: { enabled: false, frequency: 'daily' },
    });

    await createNotification({
      tenantId,
      userId,
      category: 'updated',
      title: 'Quiet hours',
      message: 'Queued',
      type: 'info',
      event: 'updated',
    });

    const logs = await NotificationDeliveryLog.find({ subscriptionId: subscription._id });
    expect(logs).toHaveLength(1);
    expect(logs[0].status).toBe('queued');
  });
});
