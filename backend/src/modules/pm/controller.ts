/*
 * SPDX-License-Identifier: MIT
 */

import type { Response, NextFunction } from 'express';

import type { AuthedRequest, AuthedRequestHandler } from '../../../types/http';
import { fail } from '../../lib/http';
import { assignmentInputSchema, templateInputSchema } from './schemas';
import {
  listTemplates,
  createTemplate,
  getTemplate,
  updateTemplate,
  deleteTemplate,
  upsertAssignment,
  removeAssignment,
  PMTemplateError,
  type PMContext,
} from './service';

const ensureTenant = (req: AuthedRequest, res: Response): req is AuthedRequest & { tenantId: string } => {
  if (!req.tenantId) {
    fail(res, 'Tenant context is required', 400);
    return false;
  }
  return true;
};

const buildContext = (req: AuthedRequest): PMContext => {
  const user = req.user as { _id?: string; id?: string } | undefined;
  const userId = user?._id ?? user?.id ?? '';
  return {
    tenantId: req.tenantId!,
    siteId: req.siteId!,
    userId,
  };
};

const send = (res: Response, data: unknown, status = 200) => {
  res.status(status).json({ success: true, data });
};

const handleError = (err: unknown, res: Response, next: NextFunction) => {
  if (err instanceof PMTemplateError) {
    fail(res, err.message, err.status);
    return;
  }
  next(err);
};

export const listTemplatesHandler: AuthedRequestHandler = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  try {
    const data = await listTemplates(buildContext(req));
    send(res, data);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const createTemplateHandler: AuthedRequestHandler = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  const parse = templateInputSchema.safeParse(req.body);
  if (!parse.success) {
    fail(res, parse.error.errors.map((e) => e.message).join(', '), 400);
    return;
  }
  try {
    const data = await createTemplate(buildContext(req), parse.data);
    send(res, data, 201);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const getTemplateHandler: AuthedRequestHandler<{ templateId: string }> = async (
  req,
  res,
  next,
) => {
  if (!ensureTenant(req, res)) return;
  try {
    const data = await getTemplate(buildContext(req), req.params.templateId);
    send(res, data);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const updateTemplateHandler: AuthedRequestHandler<{ templateId: string }> = async (
  req,
  res,
  next,
) => {
  if (!ensureTenant(req, res)) return;
  const parse = templateInputSchema.partial().safeParse(req.body);
  if (!parse.success) {
    fail(res, parse.error.errors.map((e) => e.message).join(', '), 400);
    return;
  }
  try {
    const data = await updateTemplate(buildContext(req), req.params.templateId, parse.data);
    send(res, data);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const deleteTemplateHandler: AuthedRequestHandler<{ templateId: string }> = async (
  req,
  res,
  next,
) => {
  if (!ensureTenant(req, res)) return;
  try {
    const data = await deleteTemplate(buildContext(req), req.params.templateId);
    send(res, data);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const upsertAssignmentHandler: AuthedRequestHandler<
  { templateId: string; assignmentId?: string },
  unknown,
  unknown
> = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  const parse = assignmentInputSchema.safeParse(req.body);
  if (!parse.success) {
    fail(res, parse.error.errors.map((e) => e.message).join(', '), 400);
    return;
  }
  try {
    const data = await upsertAssignment(
      buildContext(req),
      req.params.templateId,
      parse.data,
      req.params.assignmentId,
    );
    send(res, data, req.params.assignmentId ? 200 : 201);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const deleteAssignmentHandler: AuthedRequestHandler<{ templateId: string; assignmentId: string }> = async (
  req,
  res,
  next,
) => {
  if (!ensureTenant(req, res)) return;
  try {
    const data = await removeAssignment(buildContext(req), req.params.templateId, req.params.assignmentId);
    send(res, data);
  } catch (err) {
    handleError(err, res, next);
  }
};
