/*
 * SPDX-License-Identifier: MIT
 */

import { z } from 'zod';

export const workOrderSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  assetId: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  status: z.enum(['requested', 'assigned', 'in_progress', 'completed', 'cancelled']).optional(),
  type: z.enum(['corrective', 'preventive', 'inspection', 'calibration', 'safety']),
  assignedTo: z.string().optional(),
  assignees: z.array(z.string()).optional(),
  checklists: z.array(z.string()).optional(),
  partsUsed: z.array(z.string()).optional(),
  timeSpentMin: z.number().optional(),
  photos: z.array(z.string()).optional(),
  failureCode: z.string().optional(),
  department: z.string(),
  scheduledDate: z.string().optional(),
  dueDate: z.string().optional(),
  createdAt: z.string().optional(),
  completedAt: z.string().optional(),
  note: z.string().optional(),
  completedBy: z.string().optional(),
  attachments: z.array(z.string()).optional(),
  signature: z.string().optional(),
  parts: z.array(z.string()).optional(),
});

export type WorkOrderInput = z.infer<typeof workOrderSchema>;
