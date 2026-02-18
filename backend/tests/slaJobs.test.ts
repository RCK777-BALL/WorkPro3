/*
 * SPDX-License-Identifier: MIT
 */

import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

import WorkOrder from '../models/WorkOrder';
import User from '../models/User';
import Notification from '../models/Notification';
import { processBreachedSlas } from '../src/modules/work-orders/jobs';

let mongo: MongoMemoryServer | null = null;
let unavailable = false;

beforeAll(async () => {
  process.env.MONGOMS_VERSION = '6.0.5';
  try {
    mongo = await MongoMemoryServer.create({ binary: { version: process.env.MONGOMS_VERSION } });
    await mongoose.connect(mongo.getUri());
  } catch {
    unavailable = true;
  }
});

afterAll(async () => {
  if (mongo) {
    await mongoose.disconnect();
    await mongo.stop();
  }
});

describe('SLA breach handling', () => {
  it('marks breaches, escalates priority, and reassigns when overdue', async () => {
    if (unavailable) return;

    const tenantId = new mongoose.Types.ObjectId();
    const user = await User.create({
      name: 'Responder',
      email: 'responder@example.com',
      passwordHash: 'hash',
      tenantId,
      roles: ['technician'],
      employeeId: 'SLA-EMP-001',
    });
    const escalated = await User.create({
      name: 'Escalation Target',
      email: 'target@example.com',
      passwordHash: 'hash',
      tenantId,
      roles: ['admin'],
      employeeId: 'SLA-EMP-002',
    });

    const now = new Date();
    await WorkOrder.create({
      title: 'Past due SLA',
      tenantId,
      plant: new mongoose.Types.ObjectId(),
      siteId: new mongoose.Types.ObjectId(),
      assignedTo: user._id,
      slaResolveDueAt: new Date(now.getTime() - 15 * 60 * 1000),
      slaEscalations: [
        {
          trigger: 'resolve',
          thresholdMinutes: 0,
          escalateTo: [escalated._id],
          priority: 'critical',
          reassign: true,
        },
      ],
    });

    const notifySpy = vi.spyOn(Notification, 'create');

    await processBreachedSlas();

    const updated = await WorkOrder.findOne({ title: 'Past due SLA' }).lean();
    expect(updated?.slaBreachAt).toBeDefined();
    expect(updated?.priority).toBe('critical');
    expect(updated?.assignedTo?.toString()).toBe(escalated._id.toString());
    expect(updated?.timeline?.some((entry) => entry.label === 'SLA escalated')).toBe(true);
    expect(notifySpy).toHaveBeenCalled();
  });
});
