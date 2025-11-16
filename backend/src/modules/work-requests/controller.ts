/*
 * SPDX-License-Identifier: MIT
 */

import type { Request, Response, NextFunction } from 'express';

import type { AuthedRequest, AuthedRequestHandler } from '../../../types/http';
import { fail } from '../../lib/http';
import {
  WorkRequestError,
  type WorkRequestContext,
  submitPublicRequest,
  getPublicRequestStatus,
  listWorkRequests,
  getWorkRequestById,
  getWorkRequestSummary,
  convertWorkRequestToWorkOrder,
} from './service';
import { publicWorkRequestSchema, workRequestConversionSchema } from './schemas';

const ensureTenant = (
  req: AuthedRequest,
  res: Response,
): req is AuthedRequest & { tenantId: string } => {
  if (!req.tenantId) {
    fail(res, 'Tenant context is required', 400);
    return false;
  }
  return true;
};

const buildContext = (req: AuthedRequest): WorkRequestContext => ({
  tenantId: req.tenantId!,
  ...(req.siteId ? { siteId: req.siteId } : {}),
});

const send = (res: Response, data: unknown, status = 200) => {
  res.status(status).json({ success: true, data });
};

const handleError = (err: unknown, res: Response, next: NextFunction) => {
  if (err instanceof WorkRequestError) {
    fail(res, err.message, err.status);
    return;
  }
  next(err);
};

export const submitPublicRequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  const parse = publicWorkRequestSchema.safeParse(req.body);
  if (!parse.success) {
    fail(res, parse.error.errors.map((issue) => issue.message).join(', '), 400);
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
  if (!ensureTenant(req, res)) return;
  try {
    const items = await listWorkRequests(buildContext(req));
    send(res, items);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const getWorkRequestHandler: AuthedRequestHandler<{ requestId: string }> = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  try {
    const item = await getWorkRequestById(buildContext(req), req.params.requestId);
    send(res, item);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const getWorkRequestSummaryHandler: AuthedRequestHandler = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  try {
    const summary = await getWorkRequestSummary(buildContext(req));
    send(res, summary);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const convertWorkRequestHandler: AuthedRequestHandler<{ requestId: string }> = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  const parse = workRequestConversionSchema.safeParse(req.body ?? {});
  if (!parse.success) {
    fail(res, parse.error.errors.map((issue) => issue.message).join(', '), 400);
    return;
  }
  try {
    const result = await convertWorkRequestToWorkOrder(buildContext(req), req.params.requestId, parse.data);
    send(res, result);
  } catch (err) {
    handleError(err, res, next);
  }
};
