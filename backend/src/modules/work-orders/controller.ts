/*
 * SPDX-License-Identifier: MIT
 */

import type { Response, NextFunction } from 'express';
import { Types } from 'mongoose';

import type { AuthedRequest, AuthedRequestHandler } from '../../../types/http';
import { fail } from '../../lib/http';
import { approvalAdvanceSchema, slaAcknowledgeSchema, statusUpdateSchema, templateCreateSchema, templateParamSchema, templateUpdateSchema, workOrderParamSchema } from './schemas';
import { acknowledgeSla, advanceApproval, createTemplate, deleteTemplate, getTemplate, listTemplates, updateTemplate, updateWorkOrderStatus } from './service';
import type { ApprovalStepUpdate, StatusTransition, WorkOrderContext } from './types';
import type { WorkOrderTemplate } from './templateModel';

type TemplateDefaultsInput = {
  priority?: string;
  type?: string;
  assignedTo?: string | Types.ObjectId;
  checklists?: { text?: string; required?: boolean }[];
  parts?: { partId?: string | Types.ObjectId; qty?: number }[];
  status?: string;
};

const ensureContext = (req: AuthedRequest, res: Response): req is AuthedRequest & { tenantId: string } => {
  if (!req.tenantId) {
    fail(res, 'Tenant context is required', 400);
    return false;
  }
  return true;
};

const buildContext = (req: AuthedRequest): WorkOrderContext => ({
  tenantId: req.tenantId!,
  ...(req.siteId ? { siteId: req.siteId } : {}),
});

const handleError = (err: unknown, res: Response, next: NextFunction) => {
  if (err instanceof Error) {
    fail(res, err.message, 400);
    return;
  }
  next(err);
};

const normalizeTemplateDefaults = (
  defaults?: TemplateDefaultsInput | undefined,
): WorkOrderTemplate['defaults'] | undefined => {
  if (!defaults) return undefined;
  const normalized: WorkOrderTemplate['defaults'] = {};

  if (defaults.priority) normalized.priority = defaults.priority;
  if (defaults.type) normalized.type = defaults.type;
  if (defaults.status) normalized.status = defaults.status;

  if (defaults.assignedTo) {
    normalized.assignedTo = new Types.ObjectId(defaults.assignedTo);
  }

  if (defaults.checklists) {
    normalized.checklists = defaults.checklists
      .filter((item): item is { text: string; required?: boolean } => typeof item.text === 'string')
      .map((item) => ({
        text: item.text,
        ...(item.required !== undefined ? { required: item.required } : {}),
      }));
  }

  if (defaults.parts) {
    normalized.parts = defaults.parts
      .filter((part): part is { partId: string | Types.ObjectId; qty?: number } => Boolean(part.partId))
      .map((part) => ({
        partId: new Types.ObjectId(part.partId),
        ...(part.qty ? { qty: part.qty } : {}),
      }));
  }

  return normalized;
};

export const updateStatusHandler: AuthedRequestHandler<{ workOrderId: string }> = async (req, res, next) => {
  if (!ensureContext(req, res)) return;
  const parse = statusUpdateSchema.safeParse(req.body);
  if (!parse.success) {
    fail(res, parse.error.errors.map((issue) => issue.message).join(', '), 400);
    return;
  }
  try {
    const payload: StatusTransition = {
      status: parse.data.status!,
      ...(parse.data.note ? { note: parse.data.note } : {}),
    };
    const workOrder = await updateWorkOrderStatus(buildContext(req), req.params.workOrderId, payload);
    res.json({ success: true, data: workOrder });
  } catch (err) {
    handleError(err, res, next);
  }
};

export const advanceApprovalHandler: AuthedRequestHandler<{ workOrderId: string }> = async (
  req,
  res,
  next,
) => {
  if (!ensureContext(req, res)) return;
  const parse = approvalAdvanceSchema.safeParse(req.body);
  if (!parse.success) {
    fail(res, parse.error.errors.map((issue) => issue.message).join(', '), 400);
    return;
  }
  try {
    const payload: ApprovalStepUpdate = {
      approved: parse.data.approved ?? true,
      ...(parse.data.note ? { note: parse.data.note } : {}),
      approverId: undefined,
    };
    const workOrder = await advanceApproval(buildContext(req), req.params.workOrderId, payload, req.user);
    res.json({ success: true, data: workOrder });
  } catch (err) {
    handleError(err, res, next);
  }
};

export const acknowledgeSlaHandler: AuthedRequestHandler<{ workOrderId: string }> = async (
  req,
  res,
  next,
) => {
  if (!ensureContext(req, res)) return;
  const parse = slaAcknowledgeSchema.safeParse(req.body);
  if (!parse.success) {
    fail(res, parse.error.errors.map((issue) => issue.message).join(', '), 400);
    return;
  }
  try {
    const workOrder = await acknowledgeSla(
      buildContext(req),
      req.params.workOrderId,
      parse.data.kind,
      parse.data.at ? new Date(parse.data.at) : undefined,
    );
    res.json({ success: true, data: workOrder });
  } catch (err) {
    handleError(err, res, next);
  }
};

export const createTemplateHandler: AuthedRequestHandler = async (req, res, next) => {
  if (!ensureContext(req, res)) return;
  const parse = templateCreateSchema.safeParse(req.body);
  if (!parse.success) {
    fail(res, parse.error.errors.map((issue) => issue.message).join(', '), 400);
    return;
  }
  try {
    const template = await createTemplate({
      name: parse.data.name!,
      description: parse.data.description,
      tenantId: req.tenantId!,
      siteId: req.siteId,
      defaults: normalizeTemplateDefaults(parse.data.defaults),
    });
    res.status(201).json({ success: true, data: template });
  } catch (err) {
    handleError(err, res, next);
  }
};

export const listTemplatesHandler: AuthedRequestHandler = async (req, res, next) => {
  if (!ensureContext(req, res)) return;
  try {
    const templates = await listTemplates(buildContext(req));
    res.json({ success: true, data: templates });
  } catch (err) {
    handleError(err, res, next);
  }
};

export const getTemplateHandler: AuthedRequestHandler<{ templateId: string }> = async (req, res, next) => {
  if (!ensureContext(req, res)) return;
  const parse = templateParamSchema.safeParse(req.params);
  if (!parse.success) {
    fail(res, parse.error.errors.map((issue) => issue.message).join(', '), 400);
    return;
  }
  try {
    const template = await getTemplate(buildContext(req), parse.data.templateId);
    res.json({ success: true, data: template });
  } catch (err) {
    handleError(err, res, next);
  }
};

export const updateTemplateHandler: AuthedRequestHandler<{ templateId: string }> = async (req, res, next) => {
  if (!ensureContext(req, res)) return;
  const paramParse = templateParamSchema.safeParse(req.params);
  const bodyParse = templateUpdateSchema.safeParse(req.body);
  if (!paramParse.success || !bodyParse.success) {
    const errors = [paramParse.error?.errors, bodyParse.error?.errors].flat().filter(Boolean) as { message: string }[];
    fail(res, errors.map((issue) => issue.message).join(', '), 400);
    return;
  }
  try {
    const template = await updateTemplate(buildContext(req), paramParse.data.templateId, {
      ...bodyParse.data,
      defaults: normalizeTemplateDefaults(bodyParse.data.defaults),
    });
    res.json({ success: true, data: template });
  } catch (err) {
    handleError(err, res, next);
  }
};

export const deleteTemplateHandler: AuthedRequestHandler<{ templateId: string }> = async (req, res, next) => {
  if (!ensureContext(req, res)) return;
  const parse = templateParamSchema.safeParse(req.params);
  if (!parse.success) {
    fail(res, parse.error.errors.map((issue) => issue.message).join(', '), 400);
    return;
  }
  try {
    await deleteTemplate(buildContext(req), parse.data.templateId);
    res.status(204).json({ success: true });
  } catch (err) {
    handleError(err, res, next);
  }
};

export const workOrderParamValidator: AuthedRequestHandler<{ workOrderId: string }> = (req, res, next) => {
  const parse = workOrderParamSchema.safeParse(req.params);
  if (!parse.success) {
    fail(res, parse.error.errors.map((issue) => issue.message).join(', '), 400);
    return;
  }
  next();
};
