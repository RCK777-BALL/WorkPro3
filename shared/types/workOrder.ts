import type { Asset } from './asset';

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
  /** Current status */
  status: 'requested' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  /** Type of work such as corrective or preventive */
  type: 'corrective' | 'preventive' | 'inspection' | 'calibration' | 'safety';
  /** User assigned to complete the work */
  assignedTo?: string;
  assignedToAvatar?: string;
  assignees?: string[];
  checklists?: string[];
  partsUsed?: string[];
  timeSpentMin?: number;
  photos?: string[];
  failureCode?: string;
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
  attachments?: string[];
  signature?: string;
  parts?: string[];
}

export type NewWorkOrder = Omit<WorkOrder, 'id' | 'createdAt' | 'completedAt'>;
