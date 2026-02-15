/*
 * SPDX-License-Identifier: MIT
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import InspectionTemplate from '../../backend/models/InspectionTemplate';

describe('inspection template versioning', () => {
  let mongo: MongoMemoryServer;
  let tenantId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
    tenantId = new mongoose.Types.ObjectId();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongo) {
      await mongo.stop();
    }
  });

  beforeEach(async () => {
    await mongoose.connection.db?.dropDatabase();
  });

  it('prevents mutating the version of an existing template', async () => {
    const template = await InspectionTemplate.create({
      tenantId,
      name: 'Hot work',
      description: 'Permit and hot work steps',
      categories: ['safety'],
      version: 3,
      sections: [],
    });

    template.version = 5 as any;
    await template.save();

    const stored = await InspectionTemplate.findById(template._id).lean();
    expect(stored?.version).toBe(3);
  });

  it('requires creating a new document to advance a version', async () => {
    const baseline = await InspectionTemplate.create({
      tenantId,
      name: 'LOTO',
      description: 'Lockout/tagout steps',
      categories: ['safety'],
      sections: [],
    });

    const nextVersion = await InspectionTemplate.create({
      tenantId,
      name: baseline.name,
      description: baseline.description,
      categories: baseline.categories,
      sections: baseline.sections,
      version: baseline.version + 1,
    });

    const versions = await InspectionTemplate.find({ name: baseline.name })
      .select('version')
      .lean();

    expect(versions.map((entry) => entry.version).sort()).toEqual([1, 2]);
    expect(nextVersion.version).toBe(2);
  });
});

