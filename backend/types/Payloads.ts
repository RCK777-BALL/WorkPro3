/*
 * SPDX-License-Identifier: MIT
 */

export interface WorkOrderUpdatePayload {
  _id: string;
  tenantId: string;
  title: string;
  status: 'requested' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  assignees?: string[];
  deleted?: boolean;
}

export interface InventoryUpdatePayload {
  _id: string;
  tenantId: string;
  name: string;
  quantity: number;
}

export type NotificationType = 'info' | 'warning' | 'critical';

export interface NotificationPayload {
  _id: string;
  title: string;
  message: string;
  type: NotificationType;
  assetId?: string;
  tenantId: string;
  createdAt: Date;
  read: boolean;
}

