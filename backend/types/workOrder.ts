/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';
import type { WorkOrderCreate } from '../src/schemas/workOrder';

export type WorkOrderInput = Omit<WorkOrderCreate, 'assignees'> & {
  assignees?: Types.ObjectId[];
};

export interface WorkOrderType extends WorkOrderInput {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

