/*
 * SPDX-License-Identifier: MIT
 */

import type { InventoryUpdatePayload } from '../../shared/types/inventory';

export interface WorkOrderUpdatePayload {
  _id: string;
  tenantId: string;
  siteId?: string | undefined;
  plantId?: string | undefined;
  title: string;
  status:
    | 'requested'
    | 'assigned'
    | 'in_progress'
    | 'paused'
    | 'completed'
    | 'cancelled'
    | 'draft'
    | 'pending_approval'
    | 'approved';
  type?: 'corrective' | 'preventive' | 'inspection' | 'calibration' | 'safety' | undefined;
  complianceProcedureId?: string | undefined;
  calibrationIntervalDays?: number | undefined;
  assignees?: string[] | undefined;
  failureModeTags?: string[] | undefined;
  copilotSummary?: string | undefined;
  deleted?: boolean | undefined;
}

export type { InventoryUpdatePayload };

export type NotificationType = 'info' | 'warning' | 'critical';

export interface NotificationPayload {
  _id: string;
  title: string;
  message: string;
  type: NotificationType;
  assetId?: string | undefined;
  tenantId: string;
  createdAt: Date;
  read: boolean;
}
