/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect } from 'vitest';
import type { Timesheet } from '../types';

describe('Timesheets E2E Tests', () => {
  it('should create and retrieve a timesheet', async () => {
    const timesheet: Partial<Timesheet> = {
      date: '2024-01-01',
      hours: 8,
      description: 'Initial entry',
    };
    const collection = testDb.collection('timesheets');
    const result = await collection.insertOne(timesheet);
    expect(result.acknowledged).toBe(true);
    const saved = await collection.findOne({ _id: result.insertedId });
    expect(saved).toBeDefined();
    expect(saved?.hours).toBe(timesheet.hours);
  });

  it('should update a timesheet', async () => {
    const collection = testDb.collection('timesheets');
    const timesheet: Partial<Timesheet> = { date: '2024-01-02', hours: 6 };
    const result = await collection.insertOne(timesheet);
    const updateResult = await collection.updateOne(
      { _id: result.insertedId },
      { $set: { hours: 7 } }
    );
    expect(updateResult.modifiedCount).toBe(1);
    const updated = await collection.findOne({ _id: result.insertedId });
    expect(updated?.hours).toBe(7);
  });

  it('should delete a timesheet', async () => {
    const collection = testDb.collection('timesheets');
    const timesheet: Partial<Timesheet> = { date: '2024-01-03', hours: 5 };
    const result = await collection.insertOne(timesheet);
    const deleteResult = await collection.deleteOne({ _id: result.insertedId });
    expect(deleteResult.deletedCount).toBe(1);
    const deleted = await collection.findOne({ _id: result.insertedId });
    expect(deleted).toBeNull();
  });
});
