export type WorkOrderStatus =
  | 'requested'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type WorkOrderPriority = 'low' | 'medium' | 'high' | 'critical';

export interface WorkOrder {
  id: string;
  title: string;
  asset?: string;
  assetId?: string;
  priority: WorkOrderPriority;
  dueDate?: string;
  status: WorkOrderStatus;
  assignee?: string;
  assigneeId?: string;
  createdAt: string;
}

export const WORK_ORDER_STATUS_OPTIONS: { value: WorkOrderStatus; label: string }[] = [
  { value: 'requested', label: 'Requested' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const WORK_ORDER_PRIORITY_LABELS: Record<WorkOrderPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = WORK_ORDER_STATUS_OPTIONS.reduce(
  (acc, option) => ({ ...acc, [option.value]: option.label }),
  {} as Record<WorkOrderStatus, string>,
);

export const formatWorkOrderPriority = (priority: WorkOrderPriority) =>
  WORK_ORDER_PRIORITY_LABELS[priority] ?? priority;

export const formatWorkOrderStatus = (status: WorkOrderStatus) =>
  WORK_ORDER_STATUS_LABELS[status] ?? status;

export type PermitStatus = 'Pending' | 'Approved' | 'Rejected';

export interface Permit {
  id: string;
  type: 'Hot Work' | 'Confined Space' | 'Electrical' | 'Work at Height';
  requester: string;
  status: PermitStatus;
  createdAt: string;
  notes?: string;
  attachments?: { name: string; url: string }[];
}
