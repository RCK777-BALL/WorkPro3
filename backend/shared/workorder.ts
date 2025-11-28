// shared/workOrder.ts

export type WorkOrderStatus =
  | 'draft'
  | 'requested'
  | 'approved'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface SharedWorkOrder {
  id: string;
  workOrderNumber?: string | undefined;
  title: string;
  description?: string | undefined;
  status: WorkOrderStatus;
  assetId?: string | undefined;
  priority?: 'low' | 'medium' | 'high' | 'critical' | undefined;
  createdAt: string | Date;
  updatedAt: string | Date;
}
