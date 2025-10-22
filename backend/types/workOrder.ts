/*
 * SPDX-License-Identifier: MIT
 */

export type WorkOrderType =
  | 'corrective'
  | 'preventive'
  | 'inspection'
  | 'calibration'
  | 'safety';

export type WorkOrderPriority = 'low' | 'medium' | 'high' | 'critical';
export type WorkOrderStatus =
  | 'requested'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface WorkOrderChecklistInput {
  description: string;
  done?: boolean;
}

export interface WorkOrderPartInput {
  partId: string;
  qty?: number;
  cost?: number;
}

export interface WorkOrderSignatureInput {
  userId: string;
  signedAt?: string | Date;
}

export interface WorkOrderInput {
  title: string;
  description: string;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  type?: WorkOrderType;
  departmentId: string;
  line?: string;
  lineId?: string;
  station?: string;
  stationId?: string;
  pmTask?: string;
  pmTaskId?: string;
  assignees?: string[];
  checklists?: WorkOrderChecklistInput[];
  partsUsed?: WorkOrderPartInput[];
  signatures?: WorkOrderSignatureInput[];
  permits?: string[];
  requiredPermitTypes?: string[];
  teamMemberName?: string;
  importance?: 'low' | 'medium' | 'high' | 'severe';
  complianceProcedureId?: string;
  calibrationIntervalDays?: number;
  dueDate?: Date | string;
  completedAt?: Date | string;
  photos?: string[];
  timeSpentMin?: number;
  failureCode?: string;
}

export type WorkOrderUpdate = Partial<Omit<WorkOrderInput, 'departmentId'>> & {
  departmentId?: string;
  department?: string;
};

export interface WorkOrderComplete {
  timeSpentMin?: number;
  partsUsed?: WorkOrderPartInput[];
  checklists?: WorkOrderChecklistInput[];
  signatures?: WorkOrderSignatureInput[];
  photos?: string[];
  failureCode?: string;
}
