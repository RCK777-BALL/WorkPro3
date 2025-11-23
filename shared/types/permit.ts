export type PermitStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'active'
  | 'rejected'
  | 'closed'
  | 'escalated';

export type PermitApprovalStepStatus =
  | 'blocked'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'escalated';

export interface PermitApprovalStep {
  sequence: number;
  role: string;
  user?: string;
  status: PermitApprovalStepStatus;
  approvedAt?: string;
  actedBy?: string;
  notes?: string;
  escalateAfterHours?: number;
  escalateAt?: string | null;
}

export interface PermitIsolationStep {
  index: number;
  description: string;
  completed?: boolean;
  completedAt?: string;
  completedBy?: string;
  verificationNotes?: string;
}

export interface PermitHistoryEntry {
  action: string;
  by?: string;
  at: string;
  notes?: string;
}

export interface Permit {
  _id?: string;
  id?: string;
  tenantId: string;
  siteId?: string;
  permitNumber: string;
  type: string;
  description?: string;
  status: PermitStatus;
  requestedBy: string;
  workOrder?: string;
  approvalChain: PermitApprovalStep[];
  isolationSteps: PermitIsolationStep[];
  watchers: string[];
  history: PermitHistoryEntry[];
  validFrom?: string;
  validTo?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  incidents?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export type SafetyIncidentSeverity = 'minor' | 'moderate' | 'major' | 'critical';
export type SafetyIncidentStatus = 'open' | 'investigating' | 'resolved' | 'closed';

export interface SafetyIncidentAction {
  description: string;
  assignedTo?: string;
  dueDate?: string;
  completedAt?: string;
}

export interface SafetyIncidentLogEntry {
  at: string;
  by?: string;
  message: string;
}

export interface SafetyIncident {
  _id?: string;
  id?: string;
  tenantId?: string;
  siteId?: string;
  permit?: string;
  workOrder?: string;
  title: string;
  description?: string;
  severity: SafetyIncidentSeverity;
  status: SafetyIncidentStatus;
  reportedBy: string;
  reportedAt: string;
  actions: SafetyIncidentAction[];
  timeline: SafetyIncidentLogEntry[];
}

export interface SafetyKpiResponse {
  activeCount: number;
  overdueApprovals: number;
  incidentsLast30: number;
  avgApprovalHours: number;
}

export interface PermitActivityHistoryEntry {
  permitId: string;
  permitNumber: string;
  action: string;
  at: string;
  notes?: string;
}

export interface PermitActivitySummary {
  totalInvolved: number;
  pendingApprovals: number;
  activePermits: number;
  recentHistory: PermitActivityHistoryEntry[];
}
