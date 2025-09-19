/*
 * SPDX-License-Identifier: MIT
 */

export interface ChecklistItem {
  description: string;
  completed?: boolean;
}

export interface WorkOrderSignature {
  userId: string;
  signedAt?: string;
}

export interface WorkOrderPartLine {
  partId: string;
  quantity: number;
}

export type WorkOrderStatus =
  | 'requested'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface WorkOrder {
  _id: string;
  tenantId: string;
  title: string;
  assetId?: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: WorkOrderStatus;
  type: 'corrective' | 'preventive' | 'inspection' | 'calibration' | 'safety';
  assignees?: string[];
  checklists?: ChecklistItem[];
  partsUsed?: WorkOrderPartLine[];
  signatures?: WorkOrderSignature[];
  timeSpentMin?: number;
  photos?: string[];
  failureCode?: string;
  permits?: string[];
  requiredPermitTypes?: string[];
  pmTask?: string;
  department?: string;
  line?: string;
  station?: string;
  teamMemberName?: string;
  importance?: 'low' | 'medium' | 'high' | 'severe';
  complianceProcedureId?: string;
  calibrationIntervalDays?: number;
  dueDate?: string;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}



