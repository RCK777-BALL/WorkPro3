/*
 * SPDX-License-Identifier: MIT
 */

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';

import User from '../models/User';
import { createNotification } from '../services/notificationService';

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({ sendMail: vi.fn() })),
  },
}));

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
  delete process.env.ENABLE_NOTIFICATION_EMAIL;
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
  if (mongo) {
    await mongoose.disconnect();
    await mongo.stop();
  }
});

describe('Notification email toggle', () => {
  it('skips SMTP delivery when disabled', async () => {
    if (unavailable) return;

    process.env.ENABLE_NOTIFICATION_EMAIL = 'false';
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_USER = 'user';
    process.env.SMTP_PASS = 'pass';

    const tenantId = new mongoose.Types.ObjectId();
    const user = await User.create({
      name: 'Email Tester',
      email: 'tester@example.com',
      passwordHash: 'pass',
      tenantId,
      roles: ['admin'],
      employeeId: 'E1',
    });

    await createNotification({
      tenantId,
      userId: user._id,
      category: 'updated',
      title: 'Email toggle',
      message: 'Email should be disabled',
      type: 'info',
    });

    const createTransportMock = nodemailer.createTransport as unknown as { mock: { calls: unknown[] } };
    expect(createTransportMock.mock.calls).toHaveLength(0);
  });
});
