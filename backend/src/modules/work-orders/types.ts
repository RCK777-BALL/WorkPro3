import { Types } from 'mongoose';

export interface WorkOrderContext {
  tenantId: string;
  siteId?: string;
}

export interface ApprovalStepUpdate {
  note?: string;
  approverId?: Types.ObjectId;
  approved: boolean;
}

export interface StatusTransition {
  status: string;
  note?: string;
}

export interface SlaAcknowledgePayload {
  kind: 'response' | 'resolve';
  at?: Date;
}

export interface WorkOrderTemplateInput {
  name: string;
  description?: string;
  tenantId: Types.ObjectId | string;
  siteId?: Types.ObjectId | string;
  defaults?: {
    priority?: string;
    type?: string;
    assignedTo?: Types.ObjectId | string;
    checklists?: { text: string; required?: boolean }[];
    parts?: { partId: Types.ObjectId | string; qty?: number }[];
    status?: string;
  };
}
