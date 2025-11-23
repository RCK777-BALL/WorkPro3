/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { notifyMentionedUsers, parseMentions } from '../services/mentions';
import Notification from '../models/Notifications';
import User from '../models/User';

let mongo: MongoMemoryServer | null = null;
let mongoAvailable = true;

beforeAll(async () => {
  try {
    mongo = await MongoMemoryServer.create({ binary: { version: '7.0.0' } });
    await mongoose.connect(mongo.getUri());
  } catch (err) {
    mongoAvailable = false;
    // Skip Mongo-dependent tests when binaries cannot be downloaded in CI environments.
    vi.stubGlobal('MONGO_DOWNLOAD_UNAVAILABLE', true);
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) {
    await mongo.stop();
  }
});

describe('mention parsing', () => {
  it('extracts mention ids from formatted text', () => {
    const userA = new Types.ObjectId();
    const userB = new Types.ObjectId();
    const body = `Hello @{Jane|${userA.toString()}} and @{Doe|${userB.toString()}}!`;

    const mentions = parseMentions(body);

    expect(mentions.map((id) => id.toString())).toEqual([userA.toString(), userB.toString()]);
  });
});

describe('mention notifications', () => {
  it('creates notifications for mentioned users within the same tenant', async () => {
    if (!mongoAvailable || !mongo) {
      console.warn('Skipping notification test: Mongo binary unavailable.');
      return;
    }
    const tenantId = new Types.ObjectId();
    const author = await User.create({
      name: 'Author',
      email: 'author@example.com',
      passwordHash: 'hash',
      roles: ['admin'],
      tenantId,
    });
    const mentioned = await User.create({
      name: 'Mentioned',
      email: 'mentioned@example.com',
      passwordHash: 'hash',
      roles: ['admin'],
      tenantId,
    });

    await notifyMentionedUsers(
      {
        tenantId,
        entityType: 'WO',
        entityId: new Types.ObjectId(),
        authorId: author._id,
        body: 'Test body',
      },
      [mentioned._id],
    );

    const notifications = await Notification.find({ user: mentioned._id });
    expect(notifications.length).toBe(1);
  });
});
