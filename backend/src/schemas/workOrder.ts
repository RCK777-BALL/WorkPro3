/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';
import { z } from 'zod';

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const objectIdSchema = z.union([
  z.string().regex(objectIdPattern, 'Invalid ObjectId'),
  z.instanceof(Types.ObjectId),
]);

const normalizeId = (value?: string | Types.ObjectId | null): string | undefined => {
  if (!value) return undefined;
  return value instanceof Types.ObjectId ? value.toHexString() : value;
};

const partsSchema = z
  .array(
    z.object({
      partId: objectIdSchema,
      qty: z.number().optional(),
      cost: z.number().optional(),
    }),
  )
  .optional();

const checklistSchema = z
  .array(
    z.object({
      description: z.string().min(1),
      done: z.boolean().optional(),
    }),
  )
  .optional();

const signatureSchema = z
  .array(
    z.object({
      userId: objectIdSchema,
      signedAt: z.union([z.string(), z.date()]).optional(),
    }),
  )
  .optional();

const assigneeSchema = z.array(objectIdSchema).optional();
const permitSchema = z.array(objectIdSchema).optional();
const requiredPermitSchema = z.array(z.string()).optional();

const importanceSchema = z.enum(['low', 'medium', 'high', 'severe']).optional();
const prioritySchema = z.enum(['low', 'medium', 'high', 'critical']);
const statusSchema = z.enum(['requested', 'assigned', 'in_progress', 'completed', 'cancelled']);
const typeSchema = z
  .enum(['corrective', 'preventive', 'inspection', 'calibration', 'safety'])
  .optional();

const locationFields = {
  departmentId: objectIdSchema,
  lineId: objectIdSchema.optional(),
  line: objectIdSchema.optional(),
  stationId: objectIdSchema.optional(),
  station: objectIdSchema.optional(),
  pmTask: objectIdSchema.optional(),
  pmTaskId: objectIdSchema.optional(),
};

const baseBody = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  priority: prioritySchema,
  status: statusSchema,
  type: typeSchema,
  teamMemberName: z.string().optional(),
  importance: importanceSchema,
  complianceProcedureId: z.string().optional(),
  calibrationIntervalDays: z.number().int().positive().optional(),
  dueDate: z.union([z.string(), z.date()]).optional(),
  completedAt: z.union([z.string(), z.date()]).optional(),
  photos: z.array(z.string()).optional(),
  timeSpentMin: z.number().optional(),
  failureCode: z.string().optional(),
  assignees: assigneeSchema,
  checklists: checklistSchema,
  partsUsed: partsSchema,
  signatures: signatureSchema,
  permits: permitSchema,
  requiredPermitTypes: requiredPermitSchema,
  ...locationFields,
});

type BaseBody = z.infer<typeof baseBody>;

const transformLocation = (value: BaseBody) => {
  const {
    departmentId,
    lineId,
    stationId,
    pmTaskId,
    line,
    station,
    pmTask,
    ...rest
  } = value;

  const payload: Record<string, unknown> = {
    ...rest,
    department: normalizeId(departmentId),
  };

  const resolvedLine = normalizeId(line) ?? normalizeId(lineId);
  const resolvedStation = normalizeId(station) ?? normalizeId(stationId);
  const resolvedPmTask = normalizeId(pmTask) ?? normalizeId(pmTaskId);

  if (resolvedLine) payload.line = resolvedLine;
  if (resolvedStation) payload.station = resolvedStation;
  if (resolvedPmTask) payload.pmTask = resolvedPmTask;

  if (rest.assignees) {
    payload.assignees = rest.assignees.map(normalizeId).filter(Boolean);
  }
  if (rest.partsUsed) {
    payload.partsUsed = rest.partsUsed.map((part) => ({
      partId: normalizeId(part.partId)!,
      qty: part.qty,
      cost: part.cost,
    }));
  }
  if (rest.checklists) {
    payload.checklists = rest.checklists.map((item) => ({
      description: item.description,
      done: item.done ?? false,
    }));
  }
  if (rest.signatures) {
    payload.signatures = rest.signatures.map((item) => ({
      userId: normalizeId(item.userId)!,
      signedAt: item.signedAt,
    }));
  }
  if (rest.permits) {
    payload.permits = rest.permits.map((value) => normalizeId(value));
  }
  if (rest.requiredPermitTypes) {
    payload.requiredPermitTypes = Array.from(new Set(rest.requiredPermitTypes));
  }

  return payload;
};

export const workOrderCreateSchema = baseBody.transform(transformLocation);

export const workOrderUpdateSchema = baseBody
  .partial()
  .extend({ department: objectIdSchema.optional() })
  .transform((value) => {
    const result = transformLocation({
      title: value.title ?? 'placeholder',
      description: value.description ?? 'placeholder',
      priority: value.priority ?? 'medium',
      status: value.status ?? 'requested',
      departmentId: value.departmentId ?? value.department ?? new Types.ObjectId(),
      ...value,
    });

    if (!value.title) delete result.title;
    if (!value.description) delete result.description;
    if (!value.priority) delete result.priority;
    if (!value.status) delete result.status;
    if (!value.calibrationIntervalDays) delete result.calibrationIntervalDays;
    if (!value.teamMemberName) delete result.teamMemberName;
    if (!value.importance) delete result.importance;
    if (!value.complianceProcedureId) delete result.complianceProcedureId;
    if (!value.dueDate) delete result.dueDate;
    if (!value.completedAt) delete result.completedAt;
    if (!value.photos) delete result.photos;
    if (!value.timeSpentMin) delete result.timeSpentMin;
    if (!value.failureCode) delete result.failureCode;
    if (!value.type) delete result.type;
    if (!value.assignees) delete result.assignees;
    if (!value.partsUsed) delete result.partsUsed;
    if (!value.checklists) delete result.checklists;
    if (!value.signatures) delete result.signatures;
    if (!value.permits) delete result.permits;
    if (!value.requiredPermitTypes) delete result.requiredPermitTypes;
    if (!value.lineId && !value.line) delete result.line;
    if (!value.stationId && !value.station) delete result.station;
    if (!value.pmTaskId && !value.pmTask) delete result.pmTask;
    if (!value.departmentId && !value.department) delete result.department;

    return result;
  });

export const assignWorkOrderSchema = z
  .object({
    assignees: assigneeSchema,
  })
  .partial();

export const startWorkOrderSchema = z.object({}).passthrough();

export const completeWorkOrderSchema = z
  .object({
    timeSpentMin: z.number().optional(),
    partsUsed: partsSchema,
    checklists: checklistSchema,
    signatures: signatureSchema,
    photos: z.array(z.string()).optional(),
    failureCode: z.string().optional(),
  })
  .partial();

export const cancelWorkOrderSchema = z.object({}).passthrough();

export type WorkOrderCreatePayload = z.infer<typeof workOrderCreateSchema>;
export type WorkOrderUpdate = z.infer<typeof workOrderUpdateSchema>;
export type WorkOrderComplete = z.infer<typeof completeWorkOrderSchema>;
