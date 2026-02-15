/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { notifyMentionedUsers, parseMentions } from '../services/mentions';
import { buildThreadId, createComment } from '../services/comments';
import Notification from '../models/Notification';
import User from '../models/User';
import Asset from '../models/Asset';

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
      employeeId: 'EMP-MENTION-AUTHOR',
    });
    const mentioned = await User.create({
      name: 'Mentioned',
      email: 'mentioned@example.com',
      passwordHash: 'hash',
      roles: ['admin'],
      tenantId,
      employeeId: 'EMP-MENTION-MENTIONED',
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

describe('comment reply notifications', () => {
  it('notifies parent author when a reply is added', async () => {
    if (!mongoAvailable || !mongo) {
      console.warn('Skipping notification test: Mongo binary unavailable.');
      return;
    }

    const tenantId = new Types.ObjectId();
    const asset = await Asset.create({
      name: 'Test Asset',
      type: 'Electrical',
      tenantId,
      plant: new Types.ObjectId(),
    });
    const parentAuthor = await User.create({
      name: 'Parent',
      email: 'parent@example.com',
      passwordHash: 'hash',
      roles: ['admin'],
      tenantId,
      employeeId: 'EMP-MENTION-PARENT',
    });
    const replier = await User.create({
      name: 'Replier',
      email: 'replier@example.com',
      passwordHash: 'hash',
      roles: ['admin'],
      tenantId,
      employeeId: 'EMP-MENTION-REPLIER',
    });

    await Notification.deleteMany({ tenantId });

    const threadId = buildThreadId('Asset', asset._id);
    const parentComment = await createComment({
      tenantId,
      entityType: 'Asset',
      entityId: asset._id,
      userId: parentAuthor._id,
      content: 'Root comment',
      threadId,
    });

    await createComment({
      tenantId,
      entityType: 'Asset',
      entityId: asset._id,
      userId: replier._id,
      content: 'Reply comment',
      parentId: parentComment._id,
      threadId,
    });

    const notifications = await Notification.find({ user: parentAuthor._id, category: 'comment' });
    expect(notifications.length).toBe(1);
  });
});
