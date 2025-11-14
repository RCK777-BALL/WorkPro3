/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';

import PMTask, { type PMTaskDocument } from '../../../models/PMTask';
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

const toObjectId = (value: string, label: string): Types.ObjectId => {
  if (value instanceof Types.ObjectId) {
    return value;
  }
  if (!Types.ObjectId.isValid(value)) {
    throw new PMTemplateError(`Invalid ${label}`, 400);
  }
  return new Types.ObjectId(value);
};

const ensureTemplate = async (context: PMContext, templateId: string): Promise<PMTaskDocument> => {
  const task = await PMTask.findOne({ _id: templateId, tenantId: context.tenantId });
  if (!task) {
    throw new PMTemplateError('Template not found', 404);
  }
  return task;
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
  template: PMTaskDocument,
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
    message: `${template.title} ${action === 'deleted' ? 'removed from' : 'linked to'} ${asset.name}`,
    type: 'info',
  };
  if (context.userId && Types.ObjectId.isValid(context.userId)) {
    payload.user = new Types.ObjectId(context.userId);
  }
  await Notification.create(payload);
};

const serializeAssignment = (
  assignment: PMTaskDocument['assignments'][number],
  refs: {
    assetNames: Map<string, string>;
    partNames: Map<string, string>;
  },
) => ({
  id: assignment._id?.toString() ?? '',
  assetId: assignment.asset?.toString() ?? '',
  assetName: assignment.asset ? refs.assetNames.get(assignment.asset.toString()) : undefined,
  interval: assignment.interval,
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
  templates: Array<ReturnType<PMTaskDocument['toObject']>>,
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
  title: string;
  notes?: string;
  active: boolean;
  assignments: ReturnType<typeof serializeAssignment>[];
}

export const listTemplates = async (context: PMContext): Promise<PMTemplateResponse[]> => {
  const tasks = await PMTask.find({ tenantId: context.tenantId })
    .select('title notes active assignments')
    .lean();
  const refs = await collectReferenceNames(tasks);
  return tasks.map((task) => ({
    id: task._id.toString(),
    title: task.title,
    notes: task.notes ?? undefined,
    active: task.active,
    assignments: (task.assignments ?? []).map((assignment) => serializeAssignment(assignment as any, refs)),
  }));
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

  const now = new Date();
  const baseAssignment = {
    asset: asset._id,
    interval: payload.interval,
    checklist: normalizedChecklist,
    requiredParts: normalizedParts,
    nextDue: calcNextDue(now, payload.interval),
    lastGeneratedAt: now,
  };

  let assignment = assignmentId
    ? task.assignments.id(toObjectId(assignmentId, 'assignment id'))
    : undefined;
  if (assignmentId && !assignment) {
    throw new PMTemplateError('Assignment not found', 404);
  }
  if (assignment) {
    assignment.set(baseAssignment);
  } else {
    task.assignments.push(baseAssignment as any);
    assignment = task.assignments[task.assignments.length - 1];
  }
  task.asset = asset._id;
  await task.save();

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
    await notifyAssignmentChange(context, asset, task, 'deleted');
  }
  return { id: assignmentId };
};
