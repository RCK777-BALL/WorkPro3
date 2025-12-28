import type { Asset as SharedAssetType } from '../../../shared/types/asset';
import type { PermissionGrant, RoleAssignment } from '../../../shared/types/admin';

export type AuthRole =
  | 'global_admin'
  | 'plant_admin'
  | 'general_manager'
  | 'assistant_general_manager'
  | 'operations_manager'
  | 'department_leader'
  | 'assistant_department_leader'
  | 'area_leader'
  | 'team_leader'
  | 'team_member'
  | 'technical_team_member'
  | 'admin'
  | 'supervisor'
  | 'manager'
  | 'planner'
  | 'tech'
  | 'technician'
  | 'viewer';

export interface PermissionAssignment {
  name: string;
  scope?: string | null;
  grantedBy?: string;
  grantedAt?: string;
}

export type { Asset as SharedAsset } from '../../../shared/types/asset';
export type { WorkOrder as SharedWorkOrder } from '../../../shared/types/workOrder';
export type {
  InventoryItem,
  InventoryLocation,
  InventoryUpdatePayload,
  Part,
  VendorSummary,
  PurchaseOrder,
  PurchaseOrderPayload,
  InventoryAlert,
  ReorderAlertStatus,
  StockHistoryEntry,
  StockAdjustment,
  StockItem,
  PartUsageReport,
  InventoryTransfer,
  InventoryTransferPayload,
} from '../../../shared/types/inventory';
export type {
  CustomReportResponse,
  ReportField,
  ReportFilter,
  ReportQueryRequest,
  ReportTemplate,
  ReportTemplateInput,
} from '@backend-shared/reports';
export type { Vendor } from './vendor';
export type { UploadedFile, UploadResponse } from '../../../shared/types/uploads';
export type { ApiResult, PaginatedResult, SortDirection, TenantScoped } from '../../../shared/types/http';
export type {
  OnboardingState,
  OnboardingStep,
  OnboardingStepKey,
  OnboardingReminderResponse,
  PMTemplateLibraryItem,
  InspectionFormTemplate,
} from '../../../shared/types/onboarding';
export type {
  PMTemplate,
  PMTemplateAssignment,
  PMTemplateChecklistItem,
  PMTemplateRequiredPart,
  PMTemplateUpsertInput,
} from '../../../shared/types/pmTemplates';
export type {
  ProcedureTemplateSummary,
  ProcedureTemplateVersion,
} from '../../../shared/types/procedures';
export type {
  Permit,
  PermitHistoryEntry,
  PermitApprovalStep,
  PermitIsolationStep,
  SafetyIncident,
  SafetyKpiResponse,
  PermitActivitySummary,
} from '../../../shared/types/permit';
export type { PermissionGrant, RoleAssignment } from '../../../shared/types/admin';

/**
 * Defines the allowed maintenance categories for upcoming maintenance tasks.
 */
export type MaintenanceType = 'preventive' | 'corrective' | 'inspection';

export interface Asset {
  id: string;
  tenantId: string;
  siteId?: string;
  plantId?: string;
  name: string;
  type?: 'Electrical' | 'Mechanical' | 'Tooling' | 'Interface';
  qrCode?: string;
  location?: string;
  notes?: string;
  department?: string;
  departmentId?: string;
  category?: string;
  status?: 'Active' | 'Offline' | 'In Repair';
  description?: string;
  image?: string;
  serialNumber?: string;
  modelName?: string;
  manufacturer?: string;
  purchaseDate?: string;
  warrantyStart?: string;
  warrantyEnd?: string;
  purchaseCost?: number;
  expectedLifeMonths?: number;
  replacementDate?: string;
  installationDate?: string;
  lineId?: string;
  line?: string;
  station?: string;
  /** Identifier of the station the asset belongs to */
  stationId?: string;
  criticality?: 'high' | 'medium' | 'low';
  /** Optional health indicator for the asset */
  health?: string;
  lastPmDate?: string;
  lastServiced?: string;
  /** Timestamp of the most recent maintenance completed for the asset */
  lastMaintenanceDate?: string;
  /** Count of open work orders tied to the asset */
  openWorkOrders?: number;
  /** Hours of downtime accumulated in the recent reporting window */
  recentDowntimeHours?: number;
  warrantyExpiry?: string;
  openWorkOrderCount?: number;
  downtimeHours?: number;
  documents?: File[];
  reliability?: { mttrHours: number; mtbfHours: number };
  downtimeCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type AssetStatusMap = Record<string, number>;

export interface Department {
  id: string;
  name: string;
  notes?: string;
  description?: string;
  lines?: Line[];
}

export interface PlantSummary {
  id: string;
  name: string;
  location?: string;
  description?: string;
}

export interface Line {
  id: string;
  name: string;
  department: string;
  notes?: string;
  description?: string;
}

export interface Station {
  id: string;
  name: string;
  line: string;
  notes?: string;
  description?: string;
}

export interface StationWithAssets extends Station {
  assets: Asset[];
}

export interface LineWithStations extends Line {
  stations: StationWithAssets[];
}

export interface DepartmentHierarchy extends Department {
  plant: PlantSummary;
  lines: LineWithStations[];
}

export interface WorkOrderChecklistItem {
  id?: string;
  text: string;
  type?: 'checkbox' | 'numeric' | 'text' | 'pass_fail';
  required?: boolean;
  evidenceRequired?: boolean;
  completedValue?: string | number | boolean;
  completedAt?: string;
  completedBy?: string;
  evidence?: string[];
  photos?: string[];
  status?: 'not_started' | 'in_progress' | 'done' | 'blocked';
  done?: boolean;
}

export interface WorkOrderChecklistHistoryEntry {
  checklistItemId?: string;
  checklistItemLabel?: string;
  reading?: string | number | boolean | null;
  passed?: boolean;
  evidenceUrls?: string[];
  recordedAt?: string;
  recordedBy?: string;
}

export interface WorkOrderChecklistCompliance {
  totalChecks: number;
  passedChecks: number;
  passRate: number;
  status: 'compliant' | 'at_risk' | 'failing' | 'unknown';
}

export interface WorkOrder {
  /** Unique identifier */
  id: string;
  tenantId: string;
  siteId?: string;
  plantId?: string;

  /** Optional plant context */
  plant?: string;

  /** Human readable title */
  title: string;

  /** Optional detailed description */
  description?: string;

  /** Summary generated by the copilot */
  copilotSummary?: string;
  copilotSummaryUpdatedAt?: string;

  /** Automatically tagged failure modes */
  failureModeTags?: string[];

  /** Related asset identifier */
  assetId?: string;

  /** Asset related to this work order */
  asset?: Partial<Asset> & { id: string; name?: string };

  /** Priority of the work order */
  priority: 'low' | 'medium' | 'high' | 'critical';

  /** Current status */
  status: 'requested' | 'assigned' | 'in_progress' | 'paused' | 'completed' | 'cancelled' | 'draft' | 'pending_approval' | 'approved';

  /** Type of work such as corrective or preventive */
  type: 'corrective' | 'preventive' | 'inspection' | 'calibration' | 'safety';

  /** Template reference captured when generated */
  workOrderTemplateId?: string;
  templateVersion?: number;
  complianceStatus?: 'pending' | 'complete' | 'not_required';
  complianceCompletedAt?: string;

  /** Optional compliance procedure identifier */
  complianceProcedureId?: string;

  /** Optional calibration interval in days */
  calibrationIntervalDays?: number;

  /** User assigned to complete the work */
  assignedTo?: string;
  assignedToAvatar?: string;
  assignees?: string[];
  checklists?: {
    text: string;
    done: boolean;
    status?: 'not_started' | 'in_progress' | 'done' | 'blocked';
    photos?: string[];
  }[];
  checklist?: WorkOrderChecklistItem[];
  partsUsed?: { partId: string; qty: number; cost: number }[];
  checklistHistory?: WorkOrderChecklistHistoryEntry[];
  checklistCompliance?: WorkOrderChecklistCompliance;
  signatures?: { by: string; ts: string }[];
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
  permits?: string[];
  requiredPermitTypes?: string[];
  permitRequirements?: {
    type: string;
    required?: boolean;
    requiredBeforeStatus?: 'assigned' | 'in_progress' | 'completed';
    status?: 'pending' | 'approved' | 'rejected';
    approvedBy?: string;
    approvedAt?: string;
    note?: string;
  }[];
  permitApprovals?: {
    type: string;
    status?: 'pending' | 'approved' | 'rejected';
    approvedBy?: string;
    approvedAt?: string;
    note?: string;
  }[];

  approvalStatus?: 'draft' | 'pending' | 'approved' | 'rejected';
  approvalState?: 'draft' | 'pending' | 'approved' | 'rejected' | 'escalated' | 'cancelled';
  approvalStates?: {
    state: 'draft' | 'pending' | 'approved' | 'rejected' | 'escalated' | 'cancelled';
    changedAt?: string;
    changedBy?: string;
    note?: string;
  }[];
  approvalSteps?: {
    step: number;
    name: string;
    approver?: string;
    status?: 'pending' | 'approved' | 'rejected' | 'skipped';
    approvedAt?: string;
    note?: string;
    required?: boolean;
  }[];
  currentApprovalStep?: number;
  approvedBy?: string;
  approvedAt?: string;
  requestedBy?: string;
  requestedAt?: string;
  updatedAt?: string;
  slaDueAt?: string;
  slaResponseDueAt?: string;
  slaResolveDueAt?: string;
  slaRespondedAt?: string;
  slaResolvedAt?: string;
  slaBreachAt?: string;
  slaTargets?: {
    responseMinutes?: number;
    resolveMinutes?: number;
    responseDueAt?: string;
    resolveDueAt?: string;
    source?: 'policy' | 'manual';
  };
  slaEscalations?: {
    trigger: 'response' | 'resolve';
    thresholdMinutes?: number;
    escalateTo?: string[];
    escalatedAt?: string;
    channel?: 'email' | 'push' | 'sms';
    priority?: 'low' | 'medium' | 'high' | 'critical';
    reassign?: boolean;
    maxRetries?: number;
    retryBackoffMinutes?: number;
    retryCount?: number;
    nextAttemptAt?: string;
    templateKey?: string;
  }[];

  attachments?: { url: string; name?: string; uploadedBy?: string; uploadedAt?: string }[];
  timeline?: { label: string; notes?: string; createdAt?: string; createdBy?: string; type?: 'status' | 'comment' | 'approval' | 'sla' }[];

  /** Department associated with the work order */
  department: string;

  /** Optional production line associated with the work order */
  lineId?: string;
  line?: string;

  /** Optional station associated with the work order */
  stationId?: string;
  station?: string;

  /** Date fields */
  scheduledDate?: string;
  dueDate?: string;
  createdAt?: string;
  completedAt?: string;

  /** Additional metadata */
  note?: string;
  completedBy?: string;
  parts?: { partId: string; qty: number; cost: number }[];
}

export interface NewWorkOrder {
  teamMemberName: string;
  line: string;
  station: string;
  description: string;
  department: string;
  importance: 'low' | 'medium' | 'high' | 'severe';
  dateCreated: string;
}

export type RepeatConfig = {
  interval: number;
  unit: 'day' | 'week' | 'month';
  endDate?: string;
  occurrences?: number;
};

export interface MaintenanceSchedule {
  id: string;
  title: string;
  description: string;
  assetId: string;
  frequency: string;
  nextDue: string;
  estimatedDuration: number;
  instructions: string;
  type: string;
  repeatConfig: RepeatConfig;
  parts: string[];
  lastCompleted?: string;
  lastCompletedBy?: string;
  assignedTo?: string;
}

export interface PMTask {
  id: string;
  title: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'biannually' | 'annually';
  active: boolean;
  lastRun?: string;
  nextDue?: string;
  notes?: string;
  asset?: string;
  department?: string;
  workOrderTemplateId?: string;
  templateVersion?: number;
}

export interface Channel {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  unreadCount: number;
  lastMessage: string;
  lastMessageTime: string;
  pinned?: boolean;
  muted?: boolean;
}

export interface DirectMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  unreadCount: number;
  lastMessage: string;
  lastMessageTime: string;
  status: 'online' | 'away' | 'offline';
}

export interface Attachment {
  id: string;
  type: 'image' | 'file';
  url: string;
  name: string;
}

export interface Reaction {
  emoji: string;
  count: number;
  users: string[];
}

export interface Message {
  id: string;
  content: string;
  userId: string;
  userName: string;
  userAvatar: string;
  timestamp: string;
  attachments: Attachment[];
  reactions: Reaction[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: AuthRole;
  roles?: AuthRole[];
  tenantId?: string;
  siteId?: string | null;
  department: string;
  avatar?: string;
}

export interface CommentUser {
  id: string;
  name?: string;
  email?: string;
  avatar?: string;
}

export interface Comment {
  id: string;
  threadId: string;
  parentId?: string;
  content: string;
  mentions?: string[];
  user?: CommentUser;
  createdAt: string | Date;
  updatedAt?: string | Date;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: AuthRole;
  tenantId?: string;
  siteId?: string | null;
  department?: string | undefined;
  /** Unique employee identifier */
  employeeId?: string | undefined;
  /** Identifier of the member this person reports to */
  managerId?: string | null | undefined;
  avatar?: string;
}

/** Raw response shape returned by the API for team members */
export interface TeamMemberResponse {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  role: AuthRole;
  tenantId?: string;
  siteId?: string | null;
  department?: string;
  employeeId?: string;
  managerId?: string | null;
  /** Some endpoints may return this field instead of managerId */
  reportsTo?: string | null;
  avatar?: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: AuthRole;
  roles?: AuthRole[];
  permissions?: string[];
  /** Identifier for the user's tenant */
  tenantId?: string;
  /** Optional site identifier associated with the user */
  siteId?: string | null;
  /** Optional fine-grained permissions for scoped enforcement */
  permissionAssignments?: PermissionAssignment[];
  /** Optional JWT token used for authenticated requests */
  token?: string;
  /** Optional URL for the user's avatar */
  avatar?: string;
}

export interface AuthSession {
  user: AuthUser;
  token?: string;
}

export interface AuthMeResponse {
  user: AuthUser;
}

export interface AuthLoginMfaChallenge {
  mfaRequired: true;
  userId: string;
}

export interface AuthRotationRequired {
  rotationRequired: true;
  userId: string;
  email?: string | null;
  rotationToken: string;
  mfaSecret: string;
}

export type AuthLoginResponse = AuthSession | AuthLoginMfaChallenge | AuthRotationRequired;

export type AuthMfaVerifyResponse = AuthSession;

export interface Member {
  id: string;
  name: string;
  avatar?: string;
  status: 'online' | 'away' | 'offline';
  role?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'critical' | 'warning' | 'info';
  category: 'assigned' | 'updated' | 'overdue' | 'pm_due' | 'comment' | 'request_submitted';
  deliveryState: 'pending' | 'queued' | 'sent' | 'failed' | 'delivered';
  read: boolean;
  createdAt: string;
  workOrderId?: string;
  inventoryItemId?: string;
  pmTaskId?: string;
}

export interface NotificationType {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'critical';
  category: 'assigned' | 'updated' | 'overdue' | 'pm_due' | 'comment' | 'request_submitted';
  deliveryState: 'pending' | 'queued' | 'sent' | 'failed' | 'delivered';
  createdAt: string;
  read: boolean;
  workOrderId?: string;
  inventoryItemId?: string;
  pmTaskId?: string;
}

export interface WorkOrderUpdatePayload {
  _id: string;
  tenantId?: string;
  title?: string;
  status?: 'requested' | 'assigned' | 'in_progress' | 'paused' | 'completed' | 'cancelled';
  type?: 'corrective' | 'preventive' | 'inspection' | 'calibration' | 'safety';
  complianceProcedureId?: string;
  calibrationIntervalDays?: number;
  assignees?: string[];
  deleted?: boolean;
}

export interface DashboardSummary {
  totalAssets: number;
  totalWorkOrders: number;
  activeWorkOrders: number;
  completedWorkOrders: number;
  overduePmTasks: number;
}

/** Generic status/count pair used in dashboard summaries (optionally typed by a known status union) */
export type StatusCountResponse<T extends string = string> = {
  _id: T;
  count: number;
};

/** Response shape returned by the low stock endpoint */
export interface LowStockPartResponse {
  _id?: string;
  id?: string;
  name: string;
  quantity: number;
  reorderThreshold?: number;
  reorderPoint?: number;
}

/** Simplified state used within the dashboard for low stock parts */
export interface LowStockPart {
  id: string;
  name: string;
  quantity: number;
  reorderPoint: number;
}

/** Response shape for upcoming maintenance tasks */
export interface UpcomingMaintenanceResponse {
  _id?: string;
  id?: string;
  asset?: { _id?: string; id?: string; name?: string };
  nextDue: string;
  type?: MaintenanceType;
  assignedTo?: string;
  estimatedDuration?: number;
}

/** State shape for upcoming maintenance tasks used in the dashboard */
export interface UpcomingMaintenanceItem {
  id: string;
  assetName: string;
  assetId: string;
  date: string;
  type: MaintenanceType;
  assignedTo: string;
  estimatedDuration: number;
}

/** Response shape for critical alert items */
export interface CriticalAlertResponse {
  _id?: string;
  id?: string;
  asset?: { name?: string };
  priority: string;
  description?: string;
  title?: string;
  createdAt: string;
}

/** State shape for critical alerts displayed on the dashboard */
export interface CriticalAlertItem {
  id: string;
  assetName: string;
  severity: string;
  issue: string;
  timestamp: string;
}

export interface AnalyticsData {
  laborUtilization: number;
}

export interface DashboardStats {
  totalAssets: number;
  activeWorkOrders: number;
  maintenanceCompliance: number;
  inventoryAlerts: number;
}

export interface Timesheet {
  id: string;
  date: string;
  hours: number;
  description?: string;
}

export type WorkType =
  | 'work_order'
  | 'maintenance'
  | 'training'
  | 'safety'
  | 'improvement';

export interface WorkHistoryMetrics {
  safety: {
    incidentRate: number;
    safetyCompliance: number;
    nearMisses: number;
    lastIncidentDate: string;
    safetyMeetingsAttended: number;
  };
  people: {
    trainingHours: number;
    certifications: string[];
    teamCollaboration: number;
    attendanceRate: number;
    mentorshipHours: number;
  };
  productivity: {
    completedTasks: number;
    onTimeCompletion: number;
    averageResponseTime: string;
    overtimeHours: number;
    taskEfficiencyRate: number;
  };
  improvement: {
    suggestionsSubmitted: number;
    suggestionsImplemented: number;
    processImprovements: number;
    costSavings: number;
  };
}

export interface WorkHistoryEntry {
  id: string;
  date: string;
  type: WorkType;
  title: string;
  status: 'completed' | 'delayed' | 'in_progress';
  duration: number;
  notes?: string;
  category?: 'safety' | 'people' | 'productivity' | 'improvement';
}

export interface WorkHistory {
  metrics: WorkHistoryMetrics;
  recentWork: WorkHistoryEntry[];
}
