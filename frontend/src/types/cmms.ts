export type WorkOrderStatus =
  | 'Open'
  | 'In Progress'
  | 'On Hold'
  | 'Completed'
  | 'Cancelled';

export interface WorkOrder {
  id: string;
  title: string;
  asset?: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  dueDate?: string;
  status: WorkOrderStatus;
  assignee?: string;
  createdAt: string;
}

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
