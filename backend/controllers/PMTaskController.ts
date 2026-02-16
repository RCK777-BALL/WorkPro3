/*
 * SPDX-License-Identifier: MIT
 */

import { Error as MongooseError, Types } from 'mongoose';
import { validationResult } from 'express-validator';
import PMTask, { PMTaskDocument } from '../models/PMTask';
import WorkOrder from '../models/WorkOrder';
import Meter from '../models/Meter';
import WorkOrderTemplateModel from '../src/modules/work-orders/templateModel';
import { nextCronOccurrenceWithin } from '../services/PMScheduler';
import { resolveProcedureChecklist } from '../services/procedureTemplateService';
import type { AuthedRequestHandler } from '../types/http';

import type {
  PMTaskParams,
  PMTaskListResponse,
  PMTaskResponse,
  PMTaskCreateBody,
  PMTaskUpdateBody,
  PMTaskDeleteResponse,
  PMTaskGenerateWOResponse,
} from '../types/pmTask';
import type { ParamsDictionary } from 'express-serve-static-core';
import { sendResponse, auditAction, toEntityId } from '../utils';

const resolveTemplateVersion = async (templateId?: Types.ObjectId | string | null) => {
  if (!templateId || !Types.ObjectId.isValid(templateId)) return undefined;
  const template = await WorkOrderTemplateModel.findById(templateId).select('version tenantId');
  return template?.version;
};

const resolveTemplateDefaults = async (task: PMTaskDocument) => {
  if (!task.workOrderTemplateId) {
    return { checklists: undefined, templateVersion: task.templateVersion, status: 'not_required' as const };
  }

  const template = await WorkOrderTemplateModel.findOne({
    _id: task.workOrderTemplateId,
    tenantId: task.tenantId,
  }).lean();

  const templateVersion = template?.version ?? task.templateVersion;
  const checklists = template?.defaults?.checklists?.map((item) => ({
    text: item.text,
    done: false,
    status: 'not_started' as const,
  }));

  return {
    checklists,
    templateVersion,
    status: checklists?.length ? ('pending' as const) : ('not_required' as const),
    templateId: template?._id,
  };
};

const resolveProcedureDefaults = async (task: PMTaskDocument) => {
  if (!task.procedureTemplateId) {
    return { procedureChecklist: undefined, procedureSnapshot: undefined };
  }
  const resolved = await resolveProcedureChecklist(task.tenantId.toString(), task.procedureTemplateId);
  return {
    procedureChecklist: resolved?.checklist ?? undefined,
    procedureSnapshot: resolved?.snapshot ?? undefined,
  };
};

const mergePartsUsed = (
  procedureParts?: { partId: any; quantity: number }[],
) =>
  (procedureParts ?? []).map((part) => ({
    partId: part.partId,
    qty: part.quantity,
    cost: 0,
  }));


export const getAllPMTasks: AuthedRequestHandler<ParamsDictionary, PMTaskListResponse> = async (
  req,
  res,
  next,
) => {
  try {
    const { tenantId, siteId } = req;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }

    const filter: Record<string, unknown> = { tenantId };
    if (siteId) {
      filter.siteId = siteId;
    }

    const tasks = await PMTask.find(filter);
    sendResponse(res, tasks);
  } catch (err) {
    if (err instanceof MongooseError.ValidationError) {
      sendResponse(res, null, err.message, 400);
      return;
    }
    next(err);
  }
};

export const getPMTaskById: AuthedRequestHandler<PMTaskParams, PMTaskResponse> = async (
  req,
  res,
  next,
) => {
  try {
    const { tenantId } = req;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }

    if (!Types.ObjectId.isValid(req.params.id)) {
      sendResponse(res, null, 'Invalid ID', 400);
      return;
    }

    const siteFilter = req.siteId ? { siteId: req.siteId } : {};

    const task = await PMTask.findOne({
      _id: req.params.id,
      tenantId,
      ...siteFilter,
    });

    if (!task) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }

    sendResponse(res, task);
  } catch (err) {
    if (err instanceof MongooseError.ValidationError) {
      sendResponse(res, null, err.message, 400);
      return;
    }
    next(err);
  }
};

export const createPMTask: AuthedRequestHandler<ParamsDictionary, PMTaskResponse, PMTaskCreateBody> = async (
  req,
  res,
  next,
) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendResponse(res, null, { errors: errors.array() }, 400);
      return;
    }
    const templateVersion = await resolveTemplateVersion(req.body.workOrderTemplateId);
    const payload = {
      ...req.body,
      tenantId,
      siteId: req.siteId,
      ...(templateVersion ? { templateVersion } : {}),
    };
    const task: PMTaskDocument = await PMTask.create(payload as any);
    const targetId: string | Types.ObjectId = (toEntityId(task._id as Types.ObjectId) ?? task._id) as string | Types.ObjectId;
    await auditAction(req as any, 'create', 'PMTask', targetId, undefined, task.toObject());
    sendResponse(res, task, null, 201);
  } catch (err) {
    if (err instanceof MongooseError.ValidationError) {
      sendResponse(res, null, err.message, 400);
      return;
    }
    next(err);
  }
};

export const updatePMTask: AuthedRequestHandler<PMTaskParams, PMTaskResponse | null, PMTaskUpdateBody> = async (
  req,
  res,
  next,
) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    if (!Types.ObjectId.isValid(req.params.id)) {
      sendResponse(res, null, 'Invalid ID', 400);
      return;
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendResponse(res, null, { errors: errors.array() }, 400);
      return;
    }

    const siteFilter = req.siteId ? { siteId: req.siteId } : {};
    const existing = await PMTask.findOne({ _id: req.params.id, tenantId, ...siteFilter });
    if (!existing) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    const templateVersion = await resolveTemplateVersion(req.body.workOrderTemplateId);
    const task = await PMTask.findOneAndUpdate(
      { _id: req.params.id, tenantId, ...siteFilter },
      {
        ...req.body,
        ...(templateVersion ? { templateVersion } : {}),
      },
      { returnDocument: 'after', runValidators: true },
    );
    if (!task) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    const targetId: string | Types.ObjectId = (toEntityId(task!._id as Types.ObjectId) ?? task!._id) as string | Types.ObjectId;
    await auditAction(
      req as any,
      'update',
      'PMTask',
      targetId,
      existing.toObject(),
      task.toObject(),
    );
    sendResponse(res, task);
  } catch (err) {
    if (err instanceof MongooseError.ValidationError) {
      sendResponse(res, null, err.message, 400);
      return;
    }
    next(err);
  }
};

export const deletePMTask: AuthedRequestHandler<PMTaskParams, PMTaskDeleteResponse> = async (
  req,
  res,
  next,
) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    if (!Types.ObjectId.isValid(req.params.id)) {
      sendResponse(res, null, 'Invalid ID', 400);
      return;
    }

    const siteFilter = req.siteId ? { siteId: req.siteId } : {};
    const task = await PMTask.findOneAndDelete({
      _id: req.params.id,
      tenantId,
      ...siteFilter,
    });

    if (!task) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    const targetId: string | Types.ObjectId = (toEntityId(task._id as Types.ObjectId) ?? task._id) as string | Types.ObjectId;
    await auditAction(
      req as any,
      'delete',
      'PMTask',
      targetId,
      task.toObject(),
      undefined,
    );
    sendResponse(res, { message: 'Deleted successfully' });
  } catch (err) {
    if (err instanceof MongooseError.ValidationError) {
      sendResponse(res, null, err.message, 400);
      return;
    }
    next(err);
  }
};

export const generatePMWorkOrders: AuthedRequestHandler<ParamsDictionary, PMTaskGenerateWOResponse> = async (
  req,
  res,
  next,
) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const now = new Date();
    const tasks = await PMTask.find({ tenantId, active: true });
    let count = 0;
    for (const task of tasks) {
      const templateDefaults = await resolveTemplateDefaults(task);
      const procedureDefaults = await resolveProcedureDefaults(task);
      if (task.rule?.type === 'calendar' && task.rule.cron) {
        const next = nextCronOccurrenceWithin(task.rule.cron, now, 7);
        if (next) {
          const partsUsed = mergePartsUsed(procedureDefaults.procedureSnapshot?.requiredParts);
          await WorkOrder.create({
            title: `PM: ${task.title}`,
            description: task.notes || '',
            status: 'requested',
            type: 'preventive',
            ...(task.asset ? { assetId: task.asset } : {}),
            pmTask: task._id,
            department: task.department,
            dueDate: next,
            priority: 'medium',
            tenantId: task.tenantId,
            ...(procedureDefaults.procedureChecklist ? { checklist: procedureDefaults.procedureChecklist } : {}),
            ...(procedureDefaults.procedureSnapshot
              ? {
                  procedureTemplateId: procedureDefaults.procedureSnapshot.templateId,
                  procedureTemplateVersionId: procedureDefaults.procedureSnapshot.versionId,
                }
              : {}),
            ...(partsUsed.length ? { partsUsed } : {}),
            ...(templateDefaults.templateId ? { workOrderTemplateId: templateDefaults.templateId } : {}),
            ...(templateDefaults.templateVersion ? { templateVersion: templateDefaults.templateVersion } : {}),
            ...(templateDefaults.checklists ? { checklists: templateDefaults.checklists } : {}),
            complianceStatus: templateDefaults.status,
            ...(templateDefaults.status === 'not_required' ? { complianceCompletedAt: new Date() } : {}),
          } as any);
          task.lastGeneratedAt = now;
          await task.save();
          count++;
        }
      } else if (task.rule?.type === 'meter' && task.rule.meterName) {
        const meter = await Meter.findOne({
          name: task.rule.meterName,
          tenantId: task.tenantId,
        });
        if (!meter) continue;
        const sinceLast = meter.currentValue - (meter.lastWOValue || 0);
        if (sinceLast >= (task.rule.threshold || 0)) {
          const partsUsed = mergePartsUsed(procedureDefaults.procedureSnapshot?.requiredParts);
          await WorkOrder.create({
            title: `Meter PM: ${task.title}`,
            description: task.notes || '',
            status: 'requested',
            type: 'preventive',
            assetId: meter.asset,
            pmTask: task._id,
            department: task.department,
            dueDate: now,
            priority: 'medium',
            tenantId: task.tenantId,
            ...(procedureDefaults.procedureChecklist ? { checklist: procedureDefaults.procedureChecklist } : {}),
            ...(procedureDefaults.procedureSnapshot
              ? {
                  procedureTemplateId: procedureDefaults.procedureSnapshot.templateId,
                  procedureTemplateVersionId: procedureDefaults.procedureSnapshot.versionId,
                }
              : {}),
            ...(partsUsed.length ? { partsUsed } : {}),
            ...(templateDefaults.templateId ? { workOrderTemplateId: templateDefaults.templateId } : {}),
            ...(templateDefaults.templateVersion ? { templateVersion: templateDefaults.templateVersion } : {}),
            ...(templateDefaults.checklists ? { checklists: templateDefaults.checklists } : {}),
            complianceStatus: templateDefaults.status,
            ...(templateDefaults.status === 'not_required' ? { complianceCompletedAt: new Date() } : {}),
          } as any);
          meter.lastWOValue = meter.currentValue;
          await meter.save();
          task.lastGeneratedAt = now;
          await task.save();
          count++;
        }
      }
    }
    sendResponse(res, { generated: count });
  } catch (err) {
    if (err instanceof MongooseError.ValidationError) {
      sendResponse(res, null, err.message, 400);
      return;
    }
    next(err);
  }
};
