/*
 * SPDX-License-Identifier: MIT
 */

import type { Response, NextFunction } from 'express';

import type { AuthedRequest, AuthedRequestHandler } from '../../../types/http';
import { fail } from '../../lib/http';
import {
  categoryInputSchema,
  procedureTemplateInputSchema,
  procedureVersionInputSchema,
} from './procedureSchemas';
import {
  listCategories,
  createCategory,
  listProcedureTemplates,
  createProcedureTemplate,
  getProcedureTemplate,
  updateProcedureTemplate,
  deleteProcedureTemplate,
  listVersions,
  createVersion,
  getVersion,
  updateVersion,
  deleteVersion,
  publishVersion,
  PMProcedureError,
  type PMProcedureContext,
} from './procedureService';
const buildContext = (req: AuthedRequest): PMProcedureContext => ({
  tenantId: req.tenantId!,
  siteId: req.siteId!,
});

const send = (res: Response, data: unknown, status = 200) => {
  res.status(status).json({ success: true, data });
};

const handleError = (err: unknown, res: Response, next: NextFunction) => {
  if (err instanceof PMProcedureError) {
    fail(res, err.message, err.status);
    return;
  }
  next(err);
};

export const listCategoriesHandler: AuthedRequestHandler = async (req, res, next) => {
  try {
    const data = await listCategories(buildContext(req));
    send(res, data);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const createCategoryHandler: AuthedRequestHandler = async (req, res, next) => {
  const parse = categoryInputSchema.safeParse(req.body);
  if (!parse.success) {
    fail(res, parse.error.errors.map((e) => e.message).join(', '), 400);
    return;
  }
  try {
    const data = await createCategory(buildContext(req), parse.data);
    send(res, data, 201);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const listProcedureTemplatesHandler: AuthedRequestHandler = async (req, res, next) => {
  try {
    const data = await listProcedureTemplates(buildContext(req));
    send(res, data);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const createProcedureTemplateHandler: AuthedRequestHandler = async (req, res, next) => {
  const parse = procedureTemplateInputSchema.safeParse(req.body);
  if (!parse.success) {
    fail(res, parse.error.errors.map((e) => e.message).join(', '), 400);
    return;
  }
  try {
    const data = await createProcedureTemplate(buildContext(req), parse.data);
    send(res, data, 201);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const getProcedureTemplateHandler: AuthedRequestHandler<{ templateId: string }> = async (
  req,
  res,
  next,
) => {
  try {
    const data = await getProcedureTemplate(buildContext(req), req.params.templateId);
    send(res, data);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const updateProcedureTemplateHandler: AuthedRequestHandler<{ templateId: string }> = async (
  req,
  res,
  next,
) => {
  const parse = procedureTemplateInputSchema.partial().safeParse(req.body);
  if (!parse.success) {
    fail(res, parse.error.errors.map((e) => e.message).join(', '), 400);
    return;
  }
  try {
    const data = await updateProcedureTemplate(buildContext(req), req.params.templateId, parse.data);
    send(res, data);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const deleteProcedureTemplateHandler: AuthedRequestHandler<{ templateId: string }> = async (
  req,
  res,
  next,
) => {
  try {
    const data = await deleteProcedureTemplate(buildContext(req), req.params.templateId);
    send(res, data);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const listVersionsHandler: AuthedRequestHandler<{ templateId: string }> = async (req, res, next) => {
  try {
    const data = await listVersions(buildContext(req), req.params.templateId);
    send(res, data);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const createVersionHandler: AuthedRequestHandler<{ templateId: string }> = async (req, res, next) => {
  const parse = procedureVersionInputSchema.safeParse(req.body);
  if (!parse.success) {
    fail(res, parse.error.errors.map((e) => e.message).join(', '), 400);
    return;
  }
  try {
    const data = await createVersion(buildContext(req), req.params.templateId, parse.data);
    send(res, data, 201);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const getVersionHandler: AuthedRequestHandler<{ versionId: string }> = async (req, res, next) => {
  try {
    const data = await getVersion(buildContext(req), req.params.versionId);
    send(res, data);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const updateVersionHandler: AuthedRequestHandler<{ versionId: string }> = async (req, res, next) => {
  const parse = procedureVersionInputSchema.safeParse(req.body);
  if (!parse.success) {
    fail(res, parse.error.errors.map((e) => e.message).join(', '), 400);
    return;
  }
  try {
    const data = await updateVersion(buildContext(req), req.params.versionId, parse.data);
    send(res, data);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const deleteVersionHandler: AuthedRequestHandler<{ versionId: string }> = async (req, res, next) => {
  try {
    const data = await deleteVersion(buildContext(req), req.params.versionId);
    send(res, data);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const publishVersionHandler: AuthedRequestHandler<{ versionId: string }> = async (
  req,
  res,
  next,
) => {
  try {
    const data = await publishVersion(buildContext(req), req.params.versionId);
    send(res, data);
  } catch (err) {
    handleError(err, res, next);
  }
};
