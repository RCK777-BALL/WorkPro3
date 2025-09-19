/*
 * SPDX-License-Identifier: MIT
 */

import type { z } from 'zod';
import {
  workOrderCreateSchema,
  workOrderUpdateSchema,
  workOrderStatusSchema,
} from '../../schemas/workOrder';

export type WorkOrderStatus = z.infer<typeof workOrderStatusSchema>;
export type WorkOrderCreateInput = z.infer<typeof workOrderCreateSchema>;
export type WorkOrderUpdateInput = z.infer<typeof workOrderUpdateSchema>;

export interface ComplianceMetadata {
  complianceProcedureId?: string;
  calibrationIntervalDays?: number;
}

export type WorkOrderWithCompliance = WorkOrderCreateInput & ComplianceMetadata;
