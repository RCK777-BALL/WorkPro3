/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';
import WorkOrder from '../models/WorkOrder';
import type {
  WorkOrderCreateInput,
  WorkOrderQueryInput,
  WorkOrderUpdateInput,
} from '../../../shared/validators/workOrder';

export interface WorkOrderListResult {
  items: unknown[];
  total: number;
  page: number;
  limit: number;
}

const mapStatus = (status?: string) => {
  if (!status) return undefined;
  switch (status) {
    case 'open':
      return 'assigned';
    case 'on_hold':
      return 'paused';
    case 'canceled':
      return 'cancelled';
    default:
      return status;
  }
};

export const listWorkOrders = async (tenantId: string, query: WorkOrderQueryInput): Promise<WorkOrderListResult> => {
  const filter: Record<string, unknown> = { tenantId: new Types.ObjectId(tenantId) };

  const status = mapStatus(query.status);
  if (status) filter.status = status;
  if (query.priority) filter.priority = query.priority;
  if (query.assetId) filter.assetId = query.assetId;
  if (query.search) {
    const regex = new RegExp(query.search, 'i');
    filter.$or = [{ title: regex }, { description: regex }];
  }

  const [items, total] = await Promise.all([
    WorkOrder.find(filter)
      .sort({ updatedAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean(),
    WorkOrder.countDocuments(filter),
  ]);

  return { items, total, page: query.page, limit: query.limit };
};

export const getWorkOrderById = async (tenantId: string, id: string) =>
  WorkOrder.findOne({ _id: id, tenantId: new Types.ObjectId(tenantId) }).lean();

export const createWorkOrder = async (tenantId: string, input: WorkOrderCreateInput) => {
  const status = mapStatus(input.status) ?? 'assigned';
  const workOrder = await WorkOrder.create({
    ...input,
    status,
    tenantId: new Types.ObjectId(tenantId),
  });
  return workOrder.toObject();
};

export const updateWorkOrder = async (tenantId: string, id: string, input: WorkOrderUpdateInput) => {
  const patch = { ...input } as Record<string, unknown>;
  if (input.status) {
    patch.status = mapStatus(input.status);
  }

  const updated = await WorkOrder.findOneAndUpdate(
    { _id: id, tenantId: new Types.ObjectId(tenantId) },
    { $set: patch },
    { returnDocument: 'after' },
  ).lean();

  return updated;
};

export const deleteWorkOrder = async (tenantId: string, id: string) => {
  await WorkOrder.deleteOne({ _id: id, tenantId: new Types.ObjectId(tenantId) });
};
