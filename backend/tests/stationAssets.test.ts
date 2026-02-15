/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from "vitest";
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Department from '../models/Department';
import Asset from '../models/Asset';

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

describe('Station asset references', () => {
  it('stores asset ids inside stations', async () => {
    const tenantId = new mongoose.Types.ObjectId();
    const department = await Department.create({
      name: 'Prod',
      tenantId,
      plant: new mongoose.Types.ObjectId(),
      lines: [
        {
          name: 'Line1',
          tenantId,
          stations: [{ name: 'Station1', tenantId, assets: [] }],
        },
      ],
    });

    const lineId = department.lines[0]._id;
    const stationId = department.lines[0].stations[0]._id;

    const asset = await Asset.create({
      name: 'Asset1',
      type: 'Mechanical',
      location: 'Loc',
      departmentId: department._id,
      lineId,
      stationId,
      status: 'Active',
      tenantId: new mongoose.Types.ObjectId(),
    });

    department.lines[0].stations[0].assets.push(asset._id);
    await department.save();

    const updated = await Department.findById(department._id);
    expect(updated!.lines[0].stations[0].assets[0].toString()).toBe(
      asset._id.toString()
    );
  });
});
