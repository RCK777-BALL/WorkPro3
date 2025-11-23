export type WorkOrderStatus =
  | 'draft'
  | 'requested'
  | 'approved'
  | 'assigned'
  | 'in_progress'
  | 'paused'
  | 'completed'
  | 'cancelled';

export interface ChecklistItem {
  description: string;
  completed?: boolean;
  status?: 'not_started' | 'in_progress' | 'done' | 'blocked';
  photos?: string[];
}

export interface WorkOrderSignature {
  userId: string;
  signedAt?: string;
}

export interface WorkOrderPartLine {
  partId: string;
  quantity: number;
}

export interface SharedWorkOrder {
  id?: string;
  _id?: string;
  workOrderNumber?: string;
  tenantId?: string;
  siteId?: string;
  plantId?: string;
  title: string;
  assetId?: string;
  description?: string;
  copilotSummary?: string;
  copilotSummaryUpdatedAt?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  status: WorkOrderStatus;
  type?: 'corrective' | 'preventive' | 'inspection' | 'calibration' | 'safety';
  approvalStatus?: 'draft' | 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
  requestedBy?: string;
  requestedAt?: string;
  slaDueAt?: string;
  failureModeTags?: string[];
  assignees?: string[];
  checklists?: ChecklistItem[];
  partsUsed?: WorkOrderPartLine[];
  signatures?: WorkOrderSignature[];
  timeSpentMin?: number;
  photos?: string[];
  failureCode?: string;
  causeCode?: string;
  actionCode?: string;
  downtimeMinutes?: number;
  laborHours?: number;
  laborCost?: number;
  partsCost?: number;
  miscCost?: number;
  totalCost?: number;
  attachments?: { url: string; name?: string; uploadedBy?: string; uploadedAt?: string }[];
  timeline?: { label: string; notes?: string; createdAt?: string; createdBy?: string; type?: 'status' | 'comment' | 'approval' | 'sla' }[];
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
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export type WorkOrder = SharedWorkOrder;
