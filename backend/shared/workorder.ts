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
  workOrderNumber?: string;
  title: string;
  description?: string;
  status: WorkOrderStatus;
  assetId?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string | Date;
  updatedAt: string | Date;
}
