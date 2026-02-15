import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import Notification from '../../models/Notification';
import User from '../../models/User';
import { sendEscalationNotification } from '../../services/workflowEngine';

let mongo: MongoMemoryServer;
let tenantId: mongoose.Types.ObjectId;
let userId: mongoose.Types.ObjectId;

beforeAll(async () => {
  process.env.MONGOMS_VERSION = '7.0.14';
  mongo = await MongoMemoryServer.create({ binary: { version: process.env.MONGOMS_VERSION } });
  await mongoose.connect(mongo.getUri());
  tenantId = new mongoose.Types.ObjectId();
  const user = await User.create({
    name: 'Escalation User',
    email: 'escalate@example.com',
    passwordHash: 'pass',
    tenantId,
    roles: ['admin'],
    employeeId: 'E1',
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
    name: 'Escalation User',
    email: 'escalate@example.com',
    passwordHash: 'pass',
    tenantId,
    roles: ['admin'],
    employeeId: 'E1',
  });
});

describe('notification escalation', () => {
  it('creates notifications for escalations', async () => {
    await sendEscalationNotification('Escalation notice', {
      tenantId,
      userIds: [userId],
      category: 'overdue',
    });

    const notifications = await Notification.find({ tenantId, user: userId });
    expect(notifications.length).toBeGreaterThanOrEqual(1);
    expect(notifications.some((notification) => notification.title === 'Workflow escalation')).toBe(true);
    expect(notifications.some((notification) => notification.category === 'overdue')).toBe(true);
  });
});
