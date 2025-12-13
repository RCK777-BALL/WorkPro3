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
  user?: string | undefined;
  status: PermitApprovalStepStatus;
  approvedAt?: string | undefined;
  actedBy?: string | undefined;
  notes?: string | undefined;
  escalateAfterHours?: number | undefined;
  escalateAt?: string | null | undefined;
}

export interface PermitIsolationStep {
  index: number;
  description: string;
  completed?: boolean | undefined;
  completedAt?: string | undefined;
  completedBy?: string | undefined;
  verificationNotes?: string | undefined;
}

export interface PermitHistoryEntry {
  action: string;
  by?: string | undefined;
  at: string;
  notes?: string | undefined;
}

export interface Permit {
  _id?: string | undefined;
  id?: string | undefined;
  tenantId: string;
  siteId?: string | undefined;
  permitNumber: string;
  type: string;
  description?: string | undefined;
  status: PermitStatus;
  requestedBy: string;
  workOrder?: string | undefined;
  approvalChain: PermitApprovalStep[];
  isolationSteps: PermitIsolationStep[];
  watchers: string[];
  history: PermitHistoryEntry[];
  validFrom?: string | undefined;
  validTo?: string | undefined;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical' | undefined;
  incidents?: string[] | undefined;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
}

export type SafetyIncidentSeverity = 'minor' | 'moderate' | 'major' | 'critical';
export type SafetyIncidentStatus = 'open' | 'investigating' | 'resolved' | 'closed';

export interface SafetyIncidentAction {
  description: string;
  assignedTo?: string | undefined;
  dueDate?: string | undefined;
  completedAt?: string | undefined;
}

export interface SafetyIncidentLogEntry {
  at: string;
  by?: string | undefined;
  message: string;
}

export interface SafetyIncident {
  _id?: string | undefined;
  id?: string | undefined;
  tenantId?: string | undefined;
  siteId?: string | undefined;
  permit?: string | undefined;
  workOrder?: string | undefined;
  title: string;
  description?: string | undefined;
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
  notes?: string | undefined;
}

export interface PermitActivitySummary {
  totalInvolved: number;
  pendingApprovals: number;
  activePermits: number;
  recentHistory: PermitActivityHistoryEntry[];
}
