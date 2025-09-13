/*
 * SPDX-License-Identifier: MIT
 */

import { z } from 'zod';

export const workOrderSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  status: z.enum(['requested', 'assigned', 'in_progress', 'completed', 'cancelled']),
  assignedTo: z.string().optional(),
  scheduledDate: z.string().optional(),
});

export const assetSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string(),
  serialNumber: z.string().min(1, 'Serial number is required'),
  type: z.enum(['Electrical', 'Mechanical', 'Tooling', 'Interface']),
  location: z.string().min(1, 'Location is required'),
  status: z.enum(['Active', 'Offline', 'In Repair']),
});

export const messageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty'),
  channelId: z.string(),
});
