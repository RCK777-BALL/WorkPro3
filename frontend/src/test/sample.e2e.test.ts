/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect } from 'vitest';
import type { WorkOrder } from '../types';

describe('MongoDB E2E Tests', () => {
  it('should create and retrieve a work order', async () => {
    const workOrder: Partial<WorkOrder> = {
      title: 'Test Work Order',
      description: 'Test Description',
      priority: 'high',
      status: 'open',
      type: 'corrective',
    };

    // Insert work order
    const collection = testDb.collection('workOrders');
    const result = await collection.insertOne(workOrder);
    expect(result.acknowledged).toBe(true);

    // Retrieve work order
    const savedWorkOrder = await collection.findOne({ _id: result.insertedId });
    expect(savedWorkOrder).toBeDefined();
    expect(savedWorkOrder?.title).toBe((workOrder as { title: string }).title);
  });

  it('should update a work order', async () => {
    const collection = testDb.collection('workOrders');
    
    // Insert initial work order
    const workOrder: Partial<WorkOrder> = {
      title: 'Initial Title',
      status: 'open',
    };
    const result = await collection.insertOne(workOrder);

    // Update work order
    const updateResult = await collection.updateOne(
      { _id: result.insertedId },
      { $set: { status: 'in-progress' } }
    );
    expect(updateResult.modifiedCount).toBe(1);

    // Verify update
    const updatedWorkOrder = await collection.findOne({ _id: result.insertedId });
    expect(updatedWorkOrder?.status).toBe('in-progress');
  });

  it('should delete a work order', async () => {
    const collection = testDb.collection('workOrders');
    
    // Insert work order
    const workOrder: Partial<WorkOrder> = {
      title: 'To Be Deleted',
      status: 'open',
    };
    const result = await collection.insertOne(workOrder);

    // Delete work order
    const deleteResult = await collection.deleteOne({ _id: result.insertedId });
    expect(deleteResult.deletedCount).toBe(1);

    // Verify deletion
    const deletedWorkOrder = await collection.findOne({ _id: result.insertedId });
    expect(deletedWorkOrder).toBeNull();
  });
});
