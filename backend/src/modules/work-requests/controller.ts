/*
 * SPDX-License-Identifier: MIT
 */

import type { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';

import type { AuthedRequest, AuthedRequestHandler } from '../../../types/http';
import { fail } from '../../lib/http';
import type { WorkRequestStatus } from '../../../models/WorkRequest';
import {
  type WorkRequestContext,
  submitPublicRequest,
  getPublicRequestStatus,
  listWorkRequests,
  getWorkRequestById,
  getWorkRequestSummary,
  convertWorkRequestToWorkOrder,
  updateWorkRequestStatus,
  softDeleteWorkRequest,
} from './service';
import { WorkRequestError } from './errors';
import {
  publicWorkRequestSchema,
  workRequestConversionSchema,
  workRequestDecisionSchema,
  listWorkRequestQuerySchema,
} from './schemas';
import RequestType from '../../../models/RequestType';
import RequestForm from '../../../models/RequestForm';
const buildContext = (req: AuthedRequest): WorkRequestContext => ({
  tenantId: req.tenantId!,
  ...(req.siteId ? { siteId: req.siteId } : {}),
});

const send = (res: Response, data: unknown, status = 200) => {
  res.status(status).json({ success: true, data });
};

const formatZodErrors = (issues: z.ZodIssue[]) => issues.map((issue) => issue.message).join(', ');

const handleError = (err: unknown, res: Response, next: NextFunction) => {
  if (err instanceof WorkRequestError) {
    fail(res, err.message, err.status);
    return;
  }
  next(err);
};

const attachmentDefinitionSchema = z.object({
  key: z.string().trim().min(1),
  label: z.string().trim().min(1),
  required: z.boolean().optional(),
  accept: z.array(z.string().trim().min(1)).optional(),
  maxFiles: z.number().int().positive().optional(),
});

const fieldDefinitionSchema = z.object({
  key: z.string().trim().min(1),
  label: z.string().trim().min(1),
  type: z.enum(['text', 'textarea', 'select', 'number', 'checkbox']).optional(),
  required: z.boolean().optional(),
  options: z.array(z.string().trim().min(1)).optional(),
  validation: z
    .object({
      minLength: z.number().int().positive().optional(),
      maxLength: z.number().int().positive().optional(),
      pattern: z.string().optional(),
    })
    .optional(),
});

const requestTypeInputSchema = z.object({
  name: z.string().trim().min(2),
  slug: z.string().trim().min(2),
  category: z.string().trim().min(2),
  description: z.string().trim().optional(),
  requiredFields: z.array(z.string().trim().min(1)).default([]),
  attachments: z.array(attachmentDefinitionSchema).default([]),
  fields: z.array(fieldDefinitionSchema).default([]),
  defaultPriority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
});

const requestFormInputSchema = z.object({
  name: z.string().trim().min(2),
  description: z.string().trim().optional(),
  requestType: z.string().trim().optional(),
  fields: z.array(fieldDefinitionSchema).default([]),
  attachments: z.array(attachmentDefinitionSchema).default([]),
});

export const submitPublicRequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  const parse = publicWorkRequestSchema.safeParse(req.body);
  if (!parse.success) {
    fail(res, formatZodErrors(parse.error.errors), 400);
    return;
  }
  try {
    const files = Array.isArray(req.files) ? (req.files as Express.Multer.File[]) : [];
    const result = await submitPublicRequest(parse.data, files);
    send(res, result, 201);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const getPublicStatusHandler = async (req: Request, res: Response, next: NextFunction) => {
  const token = (req.params.token ?? '').trim();
  if (!token) {
    fail(res, 'A request token is required.', 400);
    return;
  }
  try {
    const result = await getPublicRequestStatus(token);
    send(res, result);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const listWorkRequestsHandler: AuthedRequestHandler = async (req, res, next) => {
  const parseQuery = listWorkRequestQuerySchema.safeParse(req.query ?? {});
  if (!parseQuery.success) {
    fail(res, formatZodErrors(parseQuery.error.errors), 400);
    return;
  }
  try {
    const items = await listWorkRequests(buildContext(req), parseQuery.data);
    send(res, items);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const getWorkRequestHandler: AuthedRequestHandler<{ requestId: string }> = async (req, res, next) => {
  try {
    const item = await getWorkRequestById(buildContext(req), req.params.requestId);
    send(res, item);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const getWorkRequestSummaryHandler: AuthedRequestHandler = async (req, res, next) => {
  try {
    const summary = await getWorkRequestSummary(buildContext(req));
    send(res, summary);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const convertWorkRequestHandler: AuthedRequestHandler<{ requestId: string }> = async (req, res, next) => {
  const parse = workRequestConversionSchema.safeParse(req.body ?? {});
  if (!parse.success) {
    fail(res, formatZodErrors(parse.error.errors), 400);
    return;
  }
  try {
    const actorId =
      req.user?._id && Types.ObjectId.isValid(req.user._id) ? new Types.ObjectId(req.user._id) : undefined;
    const result = await convertWorkRequestToWorkOrder(buildContext(req), req.params.requestId, parse.data, actorId);
    send(res, result);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const updateWorkRequestStatusHandler: AuthedRequestHandler<{ requestId: string }> = async (
  req,
  res,
  next,
) => {
  const parse = workRequestDecisionSchema.safeParse(req.body ?? {});
  if (!parse.success) {
    fail(res, formatZodErrors(parse.error.errors), 400);
    return;
  }
  try {
    const actorId =
      req.user?._id && Types.ObjectId.isValid(req.user._id) ? new Types.ObjectId(req.user._id) : undefined;
    const updated = await updateWorkRequestStatus(buildContext(req), req.params.requestId, parse.data, actorId);
    send(res, updated);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const softDeleteWorkRequestHandler: AuthedRequestHandler<{ requestId: string }> = async (
  req,
  res,
  next,
) => {
  try {
    const actorId =
      req.user?._id && Types.ObjectId.isValid(req.user._id) ? new Types.ObjectId(req.user._id) : undefined;
    const deleted = await softDeleteWorkRequest(buildContext(req), req.params.requestId, actorId);
    send(res, deleted);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const listRequestTypesHandler: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = new Types.ObjectId(req.tenantId!);
    const query: Record<string, unknown> = { tenantId };
    if (req.siteId && Types.ObjectId.isValid(req.siteId)) {
      query.siteId = new Types.ObjectId(req.siteId);
    }
    const items = await RequestType.find(query).sort({ name: 1 }).lean();
    send(res, items);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const createRequestTypeHandler: AuthedRequestHandler = async (req, res, next) => {
  const parse = requestTypeInputSchema.safeParse(req.body ?? {});
  if (!parse.success) {
    fail(res, formatZodErrors(parse.error.errors), 400);
    return;
  }
  try {
    const tenantId = new Types.ObjectId(req.tenantId!);
    const siteId = req.siteId && Types.ObjectId.isValid(req.siteId) ? new Types.ObjectId(req.siteId) : undefined;
    const created = await RequestType.create({
      ...parse.data,
      tenantId,
      ...(siteId ? { siteId } : {}),
    });
    send(res, created, 201);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const saveRequestFormHandler: AuthedRequestHandler<{ formSlug: string }> = async (req, res, next) => {
  const parse = requestFormInputSchema.safeParse(req.body ?? {});
  if (!parse.success) {
    fail(res, formatZodErrors(parse.error.errors), 400);
    return;
  }
  try {
    const tenantId = new Types.ObjectId(req.tenantId!);
    const siteId = req.siteId && Types.ObjectId.isValid(req.siteId) ? new Types.ObjectId(req.siteId) : undefined;
    const requestTypeId =
      parse.data.requestType && Types.ObjectId.isValid(parse.data.requestType)
        ? new Types.ObjectId(parse.data.requestType)
        : undefined;
    const payload = {
      name: parse.data.name,
      description: parse.data.description,
      requestType: requestTypeId,
      fields: parse.data.fields,
      attachments: parse.data.attachments,
      schema: {
        fields: parse.data.fields,
        attachments: parse.data.attachments,
        requestType: requestTypeId,
      },
      tenantId,
      ...(siteId ? { siteId } : {}),
    } satisfies Record<string, unknown>;
    const saved = await RequestForm.findOneAndUpdate(
      { slug: req.params.formSlug, tenantId },
      { $set: payload, $setOnInsert: { slug: req.params.formSlug, tenantId } },
      { returnDocument: 'after', upsert: true },
    );
    send(res, saved, 200);
  } catch (err) {
    handleError(err, res, next);
  }
};
