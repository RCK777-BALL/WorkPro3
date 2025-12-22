/*
 * SPDX-License-Identifier: MIT
 */

export interface ChecklistItem {
  /** Stable identifier for the checklist line item */
  id?: string;
  description: string;
  type?: 'checkbox' | 'numeric' | 'text' | 'pass_fail';
  required?: boolean;
  evidenceRequired?: boolean;
  completedValue?: string | number | boolean | undefined;
  completedAt?: string | undefined;
  completedBy?: string | undefined;
  completed?: boolean | undefined;
  status?: 'not_started' | 'in_progress' | 'done' | 'blocked' | undefined;
  photos?: string[] | undefined;
  evidence?: string[] | undefined;
}

export interface WorkOrderSignature {
  userId: string;
  signedAt?: string | undefined;
}

export interface WorkOrderPartLine {
  partId: string;
  quantity: number;
}

export type WorkOrderStatus =
  | 'requested'
  | 'assigned'
  | 'in_progress'
  | 'paused'
  | 'completed'
  | 'cancelled';

export interface WorkOrder {
  _id: string;
  tenantId: string;
  siteId?: string | undefined;
  plantId?: string | undefined;
  title: string;
  assetId?: string | undefined;
  description?: string | undefined;
  copilotSummary?: string | undefined;
  copilotSummaryUpdatedAt?: string | undefined;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: WorkOrderStatus;
  type: 'corrective' | 'preventive' | 'inspection' | 'calibration' | 'safety';
  workOrderTemplateId?: string | undefined;
  templateVersion?: number | undefined;
  complianceStatus?: 'pending' | 'complete' | 'not_required' | undefined;
  complianceCompletedAt?: string | undefined;
  approvalStatus?: 'draft' | 'pending' | 'approved' | 'rejected' | undefined;
  approvedBy?: string | undefined;
  approvedAt?: string | undefined;
  requestedBy?: string | undefined;
  requestedAt?: string | undefined;
  slaDueAt?: string | undefined;
  failureModeTags?: string[] | undefined;
  assignees?: string[] | undefined;
  checklists?: ChecklistItem[] | undefined;
  checklist?: ChecklistItem[] | undefined;
  partsUsed?: WorkOrderPartLine[] | undefined;
  signatures?: WorkOrderSignature[] | undefined;
  timeSpentMin?: number | undefined;
  photos?: string[] | undefined;
  failureCode?: string | undefined;
  causeCode?: string | undefined;
  actionCode?: string | undefined;
  downtimeMinutes?: number | undefined;
  laborHours?: number | undefined;
  laborCost?: number | undefined;
  partsCostTotal?: number | undefined;
  partsCost?: number | undefined;
  miscCost?: number | undefined;
  totalCost?: number | undefined;
  attachments?: { url: string; name?: string | undefined; uploadedBy?: string | undefined; uploadedAt?: string | undefined }[] | undefined;
  timeline?: { label: string; notes?: string | undefined; createdAt?: string | undefined; createdBy?: string | undefined; type?: 'status' | 'comment' | 'approval' | 'sla' | undefined }[] | undefined;
  permits?: string[] | undefined;
  requiredPermitTypes?: string[] | undefined;
  pmTask?: string | undefined;
  department?: string | undefined;
  line?: string | undefined;
  station?: string | undefined;
  teamMemberName?: string | undefined;
  importance?: 'low' | 'medium' | 'high' | 'severe' | undefined;
  complianceProcedureId?: string | undefined;
  calibrationIntervalDays?: number | undefined;
  customFields?: Record<string, unknown> | undefined;
  dueDate?: string | undefined;
  completedAt?: string | undefined;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
}



