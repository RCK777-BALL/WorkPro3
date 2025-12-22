/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import PMTemplate from '../models/PMTemplate';
import { cloneTemplateFromLibrary } from '../src/modules/templates/service';

const tenantId = new mongoose.Types.ObjectId().toString();

describe('PM template versioning immutability', () => {
  let mongo: MongoMemoryServer;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  beforeEach(async () => {
    await mongoose.connection.db?.dropDatabase();
  });

  it('clones library templates without mutating the source definition', async () => {
    const originalLibraryTasks = [
      ...require('../src/modules/templates/library').pmTemplateLibrary[0].checklist,
    ];

    const response = await cloneTemplateFromLibrary({ tenantId }, 'boiler-efficiency');

    const stored = await PMTemplate.findById(response.id).lean();
    expect(stored?.tasks).toEqual(originalLibraryTasks);
    expect(response.tasks).toEqual(originalLibraryTasks);

    // Mutating the stored document or response should not bleed back into the library template
    stored!.tasks.push('Added task');
    response.tasks?.push('Another added task');

    const libraryAfterMutation = require('../src/modules/templates/library').pmTemplateLibrary.find(
      (item: { id: string }) => item.id === 'boiler-efficiency',
    );
    expect(libraryAfterMutation?.checklist).toEqual(originalLibraryTasks);
  });

  it('creates immutable assignments history when cloned templates are later updated', async () => {
    const clone = await cloneTemplateFromLibrary({ tenantId }, 'fire-pump-weekly');
    const doc = await PMTemplate.findById(clone.id);
    expect(doc).toBeTruthy();

    doc!.assignments.push({
      asset: new mongoose.Types.ObjectId(),
      interval: 'Monthly',
      checklist: [],
      requiredParts: [],
    } as any);
    await doc!.save();

    const reloaded = await PMTemplate.findById(clone.id).lean();
    expect(reloaded?.assignments).toHaveLength(1);
    expect(reloaded?.assignments[0]?.asset?.toString()).toBeDefined();

    // ensure historical assignments are stored on the clone only
    const libraryEntry = require('../src/modules/templates/library').pmTemplateLibrary.find(
      (item: { id: string }) => item.id === 'fire-pump-weekly',
    );
    expect(libraryEntry?.assignments).toBeUndefined();
  });
});
