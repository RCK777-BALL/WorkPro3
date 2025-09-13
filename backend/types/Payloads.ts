/*
 * SPDX-License-Identifier: MIT
 */

import type { InventoryUpdatePayload } from '@shared/inventory';

export interface WorkOrderUpdatePayload {
  _id: string;
  tenantId: string;
  title: string;
  status: 'requested' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  assignees?: string[];
  deleted?: boolean;
}

export type { InventoryUpdatePayload };

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
