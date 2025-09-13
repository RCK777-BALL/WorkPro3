/*
 * SPDX-License-Identifier: MIT
 */

import type { Asset } from '@shared/asset';

/**
 * Defines the allowed maintenance categories for upcoming maintenance tasks.
 */
export type MaintenanceType = 'preventive' | 'corrective' | 'inspection';

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
}

// Additional types follow...
