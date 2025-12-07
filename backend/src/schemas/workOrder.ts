/*
 * SPDX-License-Identifier: MIT
 */

import { z } from 'zod';

const objectId = z.string().min(1, 'Identifier is required');

const checklistItem = z.object({
  description: z.string().min(1, 'Checklist description is required'),
  done: z.boolean().optional(),
  status: z
    .enum(['not_started', 'in_progress', 'done', 'blocked'])
    .optional()
    .default('not_started'),
  photos: z.array(z.string()).optional(),
});

const attachmentItem = z.object({
  url: z.string().min(1, 'Attachment URL is required'),
  name: z.string().optional(),
  uploadedBy: objectId.optional(),
  uploadedAt: z.union([z.string(), z.date()]).optional(),
});

const approvalStepItem = z.object({
  step: z.number().int().positive(),
  name: z.string().min(1),
  approver: objectId.optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'skipped']).optional(),
  approvedAt: z.union([z.string(), z.date()]).optional(),
  note: z.string().optional(),
  required: z.boolean().optional(),
});

const permitApprovalItem = z.object({
  type: z.string().min(1, 'Permit type is required'),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  approvedBy: objectId.optional(),
  approvedAt: z.union([z.string(), z.date()]).optional(),
  note: z.string().optional(),
});

const lockoutTagoutItem = z.object({
  category: z.enum(['electrical', 'mechanical', 'hydraulic', 'pneumatic', 'chemical', 'other']).default('mechanical'),
  description: z.string().min(1),
  verifiedBy: objectId.optional(),
  verifiedAt: z.union([z.string(), z.date()]).optional(),
  clearedAt: z.union([z.string(), z.date()]).optional(),
});

const partItem = z.object({
  partId: objectId,
  qty: z.number().int().positive().optional(),
  cost: z.number().nonnegative().optional(),
});

const signatureItem = z.object({
  userId: objectId,
  signedAt: z.union([z.string(), z.date()]).optional(),
  name: z.string().optional(),
});

const statusEnum = z.enum(['requested', 'assigned', 'in_progress', 'paused', 'completed', 'cancelled']);
const priorityEnum = z.enum(['low', 'medium', 'high', 'critical']);
const typeEnum = z.enum(['corrective', 'preventive', 'inspection', 'calibration', 'safety']);
const importanceEnum = z.enum(['low', 'medium', 'high', 'severe']);
const approvalStatusEnum = z.enum(['draft', 'pending', 'approved', 'rejected']);

const baseSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  priority: priorityEnum,
  status: statusEnum,
  type: typeEnum.optional().default('corrective'),
  copilotSummary: z.string().optional(),
  failureModeTags: z.array(z.string().min(1)).optional(),
  departmentId: objectId,
  asset: objectId.optional(),
  assetId: objectId.optional(),
  pmTask: objectId.optional(),
  department: objectId.optional(),
  lineId: objectId.optional(),
  stationId: objectId.optional(),
  line: objectId.optional(),
  station: objectId.optional(),
  siteId: objectId.optional(),
  plant: objectId.optional(),
  teamMemberName: z.string().optional(),
  importance: importanceEnum.optional(),
  complianceProcedureId: z.string().optional(),
  calibrationIntervalDays: z.number().int().positive().optional(),
  approvalStatus: approvalStatusEnum.optional(),
  approvalRequestedBy: objectId.optional(),
  approvedBy: objectId.optional(),
  approvedAt: z.union([z.string(), z.date()]).optional(),
  requestedBy: objectId.optional(),
  requestedAt: z.union([z.string(), z.date()]).optional(),
  slaDueAt: z.union([z.string(), z.date()]).optional(),
  slaResponseDueAt: z.union([z.string(), z.date()]).optional(),
  slaResolveDueAt: z.union([z.string(), z.date()]).optional(),
  slaRespondedAt: z.union([z.string(), z.date()]).optional(),
  slaResolvedAt: z.union([z.string(), z.date()]).optional(),
  slaBreachAt: z.union([z.string(), z.date()]).optional(),
  slaEscalations: z
    .array(
      z.object({
        trigger: z.enum(['response', 'resolve']),
        thresholdMinutes: z.number().int().positive().optional(),
        escalateTo: z.array(objectId).optional(),
        escalatedAt: z.union([z.string(), z.date()]).optional(),
        channel: z.enum(['email', 'push']).optional(),
      }),
    )
    .optional(),
  assignedTo: objectId.optional(),
  assignees: z.array(objectId).optional(),
  approvalSteps: z.array(approvalStepItem).optional(),
  currentApprovalStep: z.number().int().positive().optional(),
  checklists: z.array(checklistItem).optional(),
  partsUsed: z.array(partItem).optional(),
  signatures: z.array(signatureItem).optional(),
  permits: z.array(objectId).optional(),
  requiredPermitTypes: z.array(z.string().min(1)).optional(),
  permitApprovals: z.array(permitApprovalItem).optional(),
  lockoutTagout: z.array(lockoutTagoutItem).optional(),
  timeSpentMin: z.number().int().nonnegative().optional(),
  photos: z.array(z.string()).optional(),
  failureCode: z.string().optional(),
  causeCode: z.string().optional(),
  actionCode: z.string().optional(),
  downtimeMinutes: z.number().int().nonnegative().optional(),
  laborHours: z.number().nonnegative().optional(),
  laborCost: z.number().nonnegative().optional(),
  partsCost: z.number().nonnegative().optional(),
  miscCost: z.number().nonnegative().optional(),
  totalCost: z.number().nonnegative().optional(),
  attachments: z.array(attachmentItem).optional(),
  timeline: z
    .array(
      z.object({
        label: z.string().min(1),
        notes: z.string().optional(),
        createdAt: z.union([z.string(), z.date()]).optional(),
        createdBy: objectId.optional(),
        type: z.enum(['status', 'comment', 'approval', 'sla']).optional(),
      }),
    )
    .optional(),
  customFields: z.record(z.any()).optional(),
  dueDate: z.union([z.string(), z.date()]).optional(),
  completedAt: z.union([z.string(), z.date()]).optional(),
});

export const workOrderCreateSchema = baseSchema;

export const workOrderUpdateSchema = baseSchema.partial();

export const assignWorkOrderSchema = z.object({
  assignees: z.array(objectId).optional(),
});

export const startWorkOrderSchema = z.object({});

export const completeWorkOrderSchema = z.object({
  timeSpentMin: z.number().int().nonnegative().optional(),
  partsUsed: z.array(partItem).optional(),
  checklists: z.array(checklistItem).optional(),
  signatures: z.array(signatureItem).optional(),
  photos: z.array(z.string()).optional(),
  failureCode: z.string().optional(),
});

export const cancelWorkOrderSchema = z.object({
  reason: z.string().optional(),
});

export type WorkOrderUpdate = z.infer<typeof workOrderUpdateSchema>;
export type WorkOrderComplete = z.infer<typeof completeWorkOrderSchema>;
