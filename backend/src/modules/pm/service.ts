/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';

import PMTemplate, { type PMTemplateDocument } from '../../../models/PMTemplate';
import Asset, { type AssetDoc } from '../../../models/Asset';
import InventoryItem, { type IInventoryItem } from '../../../models/InventoryItem';
import Notification from '../../../models/Notifications';
import { calcNextDue } from '../../../services/PMScheduler';

import type { AssignmentInput } from './schemas';

export interface PMContext {
  tenantId: string;
  siteId?: string;
  userId?: string;
}

export class PMTemplateError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'PMTemplateError';
    this.status = status;
  }
}

interface ChecklistItemLean {
  _id?: Types.ObjectId;
  description: string;
  required?: boolean;
}

interface RequiredPartLean {
  _id?: Types.ObjectId;
  partId?: Types.ObjectId;
  quantity?: number;
}

interface AssignmentLean {
  _id?: Types.ObjectId;
  asset?: Types.ObjectId;
  interval: string;
  usageMetric?: 'runHours' | 'cycles';
  usageTarget?: number;
  usageLookbackDays?: number;
  checklist?: ChecklistItemLean[];
  requiredParts?: RequiredPartLean[];
  nextDue?: Date;
}

type PMTemplateLean = Pick<
  PMTemplateDocument,
  | '_id'
  | 'name'
  | 'category'
  | 'description'
  | 'tasks'
  | 'estimatedMinutes'
  | 'createdAt'
  | 'updatedAt'
> & { assignments?: AssignmentLean[] };

type AssignmentObject = PMTemplateDocument['assignments'][number] | AssignmentLean;

const toObjectId = (value: string | Types.ObjectId, label: string): Types.ObjectId => {
  if (value instanceof Types.ObjectId) {
    return value;
  }
  if (!Types.ObjectId.isValid(value)) {
    throw new PMTemplateError(`Invalid ${label}`, 400);
  }
  return new Types.ObjectId(value);
};

const ensureTemplate = async (context: PMContext, templateId: string): Promise<PMTemplateDocument> => {
  const template = await PMTemplate.findOne({ _id: templateId, tenantId: context.tenantId });
  if (!template) {
    throw new PMTemplateError('Template not found', 404);
  }
  return template;
};

const ensureAsset = async (context: PMContext, assetId: string): Promise<AssetDoc> => {
  const asset = await Asset.findOne({ _id: assetId, tenantId: context.tenantId });
  if (!asset) {
    throw new PMTemplateError('Asset not found', 404);
  }
  return asset;
};

const ensureParts = async (
  context: PMContext,
  partIds: Types.ObjectId[],
): Promise<Map<string, string>> => {
  if (!partIds.length) {
    return new Map();
  }
  const parts = await InventoryItem.find({
    _id: { $in: partIds },
    tenantId: context.tenantId,
  })
    .select('name')
    .lean();
  const partMap = new Map(parts.map((part) => [part._id.toString(), part.name]));
  for (const id of partIds) {
    if (!partMap.has(id.toString())) {
      throw new PMTemplateError('Part not found', 404);
    }
  }
  return partMap;
};

const notifyAssignmentChange = async (
  context: PMContext,
  asset: AssetDoc,
  template: PMTemplateDocument,
  action: 'created' | 'updated' | 'deleted',
) => {
  const payload: {
    tenantId: Types.ObjectId;
    assetId: Types.ObjectId;
    title: string;
    message: string;
    type: 'info';
    user?: Types.ObjectId;
  } = {
    tenantId: toObjectId(context.tenantId, 'tenant id'),
    assetId: asset._id,
    title: `PM assignment ${action}`,
    message: `${template.name} ${action === 'deleted' ? 'removed from' : 'linked to'} ${asset.name}`,
    type: 'info',
  };
  if (context.userId && Types.ObjectId.isValid(context.userId)) {
    payload.user = new Types.ObjectId(context.userId);
  }
  await Notification.create(payload);
};

const linkTemplateToAsset = async (assetId: Types.ObjectId, templateId: Types.ObjectId) => {
  await Asset.updateOne(
    { _id: assetId },
    {
      $addToSet: {
        pmTemplateIds: templateId,
      },
    },
  );
};

const unlinkTemplateFromAsset = async (assetId: Types.ObjectId, templateId: Types.ObjectId) => {
  await Asset.updateOne(
    { _id: assetId },
    {
      $pull: {
        pmTemplateIds: templateId,
      },
    },
  );
};

const serializeAssignment = (
  assignment: AssignmentObject,
  refs: {
    assetNames: Map<string, string>;
    partNames: Map<string, string>;
  },
) => ({
  id: assignment._id?.toString() ?? '',
  assetId: assignment.asset?.toString() ?? '',
  assetName: assignment.asset ? refs.assetNames.get(assignment.asset.toString()) : undefined,
  interval: assignment.interval,
  usageMetric: assignment.usageMetric ?? undefined,
  usageTarget: assignment.usageTarget ?? undefined,
  usageLookbackDays: assignment.usageLookbackDays ?? undefined,
  nextDue: assignment.nextDue?.toISOString(),
  checklist: (assignment.checklist ?? []).map((item) => ({
    id: item._id?.toString() ?? '',
    description: item.description,
    required: item.required ?? true,
  })),
  requiredParts: (assignment.requiredParts ?? []).map((part) => ({
    id: part._id?.toString() ?? '',
    partId: part.partId?.toString() ?? '',
    partName: part.partId ? refs.partNames.get(part.partId.toString()) : undefined,
    quantity: part.quantity ?? 1,
  })),
});

const collectReferenceNames = async (
  templates: PMTemplateLean[],
): Promise<{
  assetNames: Map<string, string>;
  partNames: Map<string, string>;
}> => {
  const assetIds = new Set<string>();
  const partIds = new Set<string>();
  for (const template of templates) {
    for (const assignment of template.assignments ?? []) {
      if (assignment.asset) {
        assetIds.add(assignment.asset.toString());
      }
      for (const part of assignment.requiredParts ?? []) {
        if (part.partId) {
          partIds.add(part.partId.toString());
        }
      }
    }
  }
  const [assets, parts] = await Promise.all([
    assetIds.size
      ? Asset.find({ _id: { $in: Array.from(assetIds) } })
          .select('name')
          .lean()
      : [],
    partIds.size
      ? InventoryItem.find({ _id: { $in: Array.from(partIds) } })
          .select('name')
          .lean()
      : [],
  ]);
  return {
    assetNames: new Map((assets as AssetDoc[]).map((asset) => [asset._id.toString(), asset.name])),
    partNames: new Map((parts as IInventoryItem[]).map((part) => [part._id.toString(), part.name])),
  };
};

export interface PMTemplateResponse {
  id: string;
  name: string;
  category: string;
  description?: string;
  tasks: string[];
  estimatedMinutes?: number;
  assignments: ReturnType<typeof serializeAssignment>[];
  createdAt?: string;
  updatedAt?: string;
}

export const listTemplates = async (context: PMContext): Promise<PMTemplateResponse[]> => {
  const tasks = (await PMTemplate.find({ tenantId: context.tenantId })
    .select('name category description tasks estimatedMinutes assignments createdAt updatedAt')
    .lean()) as unknown as PMTemplateLean[];
  const refs = await collectReferenceNames(tasks);
  return tasks.map((task) => ({
    id: task._id.toString(),
    name: task.name,
    category: task.category,
    ...(task.description ? { description: task.description } : {}),
    tasks: task.tasks ?? [],
    estimatedMinutes: task.estimatedMinutes ?? undefined,
    assignments: (task.assignments ?? []).map((assignment) => serializeAssignment(assignment, refs)),
    createdAt: task?.createdAt?.toISOString?.(),
    updatedAt: task?.updatedAt?.toISOString?.(),
  }));
};

const normalizeTasks = (input?: string[]) =>
  (input ?? [])
    .map((task) => task.trim())
    .filter((task) => task.length > 0);

export const createTemplate = async (
  context: PMContext,
  payload: Pick<PMTemplateResponse, 'name' | 'category' | 'description' | 'tasks' | 'estimatedMinutes'>,
): Promise<PMTemplateResponse> => {
  const tenantId = toObjectId(context.tenantId, 'tenant id');
  const doc = await PMTemplate.create({
    name: payload.name,
    category: payload.category,
    description: payload.description ?? '',
    tasks: normalizeTasks(payload.tasks),
    estimatedMinutes: payload.estimatedMinutes ?? 0,
    tenantId,
    assignments: [],
  });

  return {
    id: doc._id.toString(),
    name: doc.name,
    category: doc.category,
    description: doc.description ?? undefined,
    tasks: doc.tasks ?? [],
    estimatedMinutes: doc.estimatedMinutes ?? undefined,
    assignments: [],
    createdAt: doc.createdAt?.toISOString(),
    updatedAt: doc.updatedAt?.toISOString(),
  };
};

export const getTemplate = async (context: PMContext, templateId: string): Promise<PMTemplateResponse> => {
  const template = await ensureTemplate(context, templateId);
  const templateObject = template.toObject();
  const refs = await collectReferenceNames([templateObject as unknown as PMTemplateLean]);
  return {
    id: template._id.toString(),
    name: templateObject.name,
    category: templateObject.category,
    description: templateObject.description ?? undefined,
    tasks: templateObject.tasks ?? [],
    estimatedMinutes: templateObject.estimatedMinutes ?? undefined,
    assignments: (templateObject.assignments ?? []).map((assignment) => serializeAssignment(assignment, refs)),
    createdAt: templateObject.createdAt?.toISOString?.(),
    updatedAt: templateObject.updatedAt?.toISOString?.(),
  };
};

export const updateTemplate = async (
  context: PMContext,
  templateId: string,
  payload: Partial<Pick<PMTemplateResponse, 'name' | 'category' | 'description' | 'tasks' | 'estimatedMinutes'>>,
): Promise<PMTemplateResponse> => {
  const template = await ensureTemplate(context, templateId);
  template.set({
    ...(payload.name ? { name: payload.name } : {}),
    ...(payload.category ? { category: payload.category } : {}),
    ...(payload.description !== undefined ? { description: payload.description } : {}),
    ...(payload.tasks ? { tasks: normalizeTasks(payload.tasks) } : {}),
    ...(payload.estimatedMinutes !== undefined ? { estimatedMinutes: payload.estimatedMinutes } : {}),
  });
  await template.save();
  return getTemplate(context, templateId);
};

export const deleteTemplate = async (
  context: PMContext,
  templateId: string,
): Promise<{ id: string }> => {
  const template = await ensureTemplate(context, templateId);
  await template.deleteOne();
  return { id: template._id.toString() };
};

const normalizeChecklist = (input?: AssignmentInput['checklist']) =>
  (input ?? [])
    .map((item) => ({
      description: item.description.trim(),
      required: item.required ?? true,
    }))
    .filter((item) => item.description.length > 0);

const normalizeParts = (input?: AssignmentInput['requiredParts']) =>
  (input ?? [])
    .filter((part) => Boolean(part.partId))
    .map((part) => ({
      partId: toObjectId(part.partId, 'part id'),
      quantity: part.quantity && part.quantity > 0 ? part.quantity : 1,
    }));

export const upsertAssignment = async (
  context: PMContext,
  templateId: string,
  payload: AssignmentInput,
  assignmentId?: string,
) => {
  const task = await ensureTemplate(context, templateId);
  const asset = await ensureAsset(context, payload.assetId);
  const normalizedChecklist = normalizeChecklist(payload.checklist);
  const normalizedParts = normalizeParts(payload.requiredParts);
  const partNames = await ensureParts(
    context,
    normalizedParts.map((part) => part.partId),
  );

  let assignment = assignmentId
    ? task.assignments.id(toObjectId(assignmentId, 'assignment id'))
    : undefined;
  if (assignmentId && !assignment) {
    throw new PMTemplateError('Assignment not found', 404);
  }

  const now = new Date();
  const resolvedUsageMetric = payload.usageMetric ?? assignment?.usageMetric;
  const baseAssignment = {
    asset: asset._id,
    interval: payload.interval,
    usageMetric: resolvedUsageMetric,
    usageTarget: payload.usageTarget ?? assignment?.usageTarget,
    usageLookbackDays:
      payload.usageLookbackDays ??
      assignment?.usageLookbackDays ??
      (resolvedUsageMetric ? 30 : undefined),
    checklist: normalizedChecklist,
    requiredParts: normalizedParts,
    nextDue: calcNextDue(now, payload.interval),
    lastGeneratedAt: now,
  };
  if (assignment) {
    assignment.set(baseAssignment);
  } else {
    task.assignments.push(baseAssignment as any);
    assignment = task.assignments[task.assignments.length - 1];
  }
  await task.save();
  await linkTemplateToAsset(asset._id, task._id);

  await notifyAssignmentChange(context, asset, task, assignmentId ? 'updated' : 'created');

  return serializeAssignment(assignment, {
    assetNames: new Map([[asset._id.toString(), asset.name]]),
    partNames,
  });
};

export const removeAssignment = async (
  context: PMContext,
  templateId: string,
  assignmentId: string,
): Promise<{ id: string }> => {
  const task = await ensureTemplate(context, templateId);
  const assignment = task.assignments.id(toObjectId(assignmentId, 'assignment id'));
  if (!assignment) {
    throw new PMTemplateError('Assignment not found', 404);
  }
  const assetId = assignment.asset;
  assignment.deleteOne();
  await task.save();
  const asset = assetId ? await Asset.findById(assetId) : null;
  if (asset) {
    const stillLinked = task.assignments.some(
      (existing) => existing.asset?.toString() === asset._id.toString(),
    );
    if (!stillLinked) {
      await unlinkTemplateFromAsset(asset._id, task._id);
    }
    await notifyAssignmentChange(context, asset, task, 'deleted');
  }
  return { id: assignmentId };
};
