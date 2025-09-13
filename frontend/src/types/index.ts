/*
 * SPDX-License-Identifier: MIT
 */

/**
 * Defines the allowed maintenance categories for upcoming maintenance tasks.
 */
export type MaintenanceType = 'preventive' | 'corrective' | 'inspection';

export interface Asset {
  id: string;
  name: string;
  type?: 'Electrical' | 'Mechanical' | 'Tooling' | 'Interface';
  location?: string;
  department?: string;
  category?: string;
  status?: 'Active' | 'Offline' | 'In Repair';
  description?: string;
  image?: string;
  serialNumber?: string;
  modelName?: string;
  manufacturer?: string;
  purchaseDate?: string;
  installationDate?: string;
  line?: string;
  station?: string;
  /** Identifier of the station the asset belongs to */
  stationId?: string;
  criticality?: 'high' | 'medium' | 'low';
  lastPmDate?: string;
  lastServiced?: string;
  warrantyExpiry?: string;
  documents?: File[];
  createdAt?: string;
  updatedAt?: string;
}

export type AssetStatusMap = Record<string, number>;

export interface Department {
  id: string;
  name: string;
}

export interface Line {
  id: string;
  name: string;
  department: string;
}

export interface Station {
  id: string;
  name: string;
  line: string;
}

export interface StationWithAssets extends Station {
  assets: Asset[];
}

export interface LineWithStations extends Line {
  stations: StationWithAssets[];
}

export interface DepartmentHierarchy extends Department {
  lines: LineWithStations[];
}

export interface WorkOrder {
  /** Unique identifier */
  id: string;

  /** Human readable title */
  title: string;

  /** Optional detailed description */
  description?: string;

  /** Related asset identifier */
  assetId?: string;

  /** Asset related to this work order */
  asset?: Asset;

  /** Priority of the work order */
  priority: 'low' | 'medium' | 'high' | 'critical';

  /** Current status (note: hyphenated strings) */
  status: 'open' | 'in-progress' | 'on-hold' | 'completed';

  /** Type of work such as corrective or preventive */
  type: 'corrective' | 'preventive' | 'inspection' | 'calibration' | 'safety';

  /** User assigned to complete the work */
  assignedTo?: string;
  assignedToAvatar?: string;

  /** Department associated with the work order */
  department: string;

  /** Date fields */
  scheduledDate?: string;
  dueDate?: string;
  createdAt?: string;
  completedAt?: string;

  /** Additional metadata */
  note?: string;
  completedBy?: string;
  attachments?: any[];
  signature?: string;
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

export interface Part {
  id: string;
  name: string;
  description?: string;
  category?: string;
  sku: string;
  location?: string;
  quantity: number;
  unitCost: number;
  reorderPoint: number;
  reorderThreshold?: number;
  lastRestockDate?: string;
  vendor?: string;
  lastOrderDate: string;
  image?: string;
}

export interface Vendor {
  id: string;
  name: string;
  contact?: string;
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
  role: 'admin' | 'supervisor' | 'planner' | 'tech';
  department: string;
  avatar?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role:
    | 'admin'
    | 'supervisor'
    | 'planner'
    | 'tech'
    | 'team_member'
    | 'team_leader'
    | 'area_leader'
    | 'department_leader';
  department?: string;
  /** Unique employee identifier */
  employeeId?: string;
  /** Identifier of the member this person reports to */
  managerId?: string | null;
  avatar?: string;
}

/** Raw response shape returned by the API for team members */
export interface TeamMemberResponse {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  role:
    | 'admin'
    | 'supervisor'
    | 'planner'
    | 'tech'
    | 'team_member'
    | 'team_leader'
    | 'area_leader'
    | 'department_leader';
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
  role:
    | 'admin'
    | 'supervisor'
    | 'planner'
    | 'tech'
    | 'team_member'
    | 'team_leader'
    | 'area_leader'
    | 'department_leader';
  /** Identifier for the user's tenant */
  tenantId?: string;
  /** Optional JWT token used for authenticated requests */
  token?: string;
  /** Optional URL for the user's avatar */
  avatar?: string;
}

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
  read: boolean;
  createdAt: string;
}

export interface NotificationType {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'critical';
  createdAt: string;
  read: boolean;
}

export interface WorkOrderUpdatePayload {
  _id: string;
  title?: string;
  deleted?: boolean;
}

export interface InventoryUpdatePayload {
  _id: string;
  name?: string;
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
  asset?: { _id?: string; name?: string };
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
