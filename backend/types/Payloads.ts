/*
 * SPDX-License-Identifier: MIT
 */

import type { InventoryUpdatePayload } from '../../shared/types/inventory';

export interface WorkOrderUpdatePayload {
  _id: string;
  tenantId: string;
  siteId?: string;
  plantId?: string;
  title: string;
  status: 'requested' | 'assigned' | 'in_progress' | 'paused' | 'completed' | 'cancelled';
  type?: 'corrective' | 'preventive' | 'inspection' | 'calibration' | 'safety';
  complianceProcedureId?: string;
  calibrationIntervalDays?: number;
  assignees?: string[];
  failureModeTags?: string[];
  copilotSummary?: string;
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
