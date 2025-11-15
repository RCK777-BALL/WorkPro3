/*
 * SPDX-License-Identifier: MIT
 */

import type { Response, NextFunction } from 'express';

import type { AuthedRequest, AuthedRequestHandler } from '../../../types/http';
import { fail } from '../../lib/http';
import type { PMContext } from '../pm/service';
import { PMTemplateError } from '../pm/service';
import { cloneTemplateFromLibrary, listTemplateLibrary } from './service';

const ensureTenant = (req: AuthedRequest, res: Response): req is AuthedRequest & { tenantId: string } => {
  if (!req.tenantId) {
    fail(res, 'Tenant context is required', 400);
    return false;
  }
  return true;
};

const buildContext = (req: AuthedRequest): PMContext => {
  const user = req.user as { _id?: string; id?: string } | undefined;
  return {
    tenantId: req.tenantId!,
    siteId: req.siteId,
    userId: user?._id ?? user?.id,
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

export const listTemplateLibraryHandler: AuthedRequestHandler = (_req, res) => {
  send(res, listTemplateLibrary());
};

export const cloneTemplateHandler: AuthedRequestHandler<{ templateId: string }> = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  try {
    const data = await cloneTemplateFromLibrary(buildContext(req), req.params.templateId);
    send(res, data, 201);
  } catch (err) {
    handleError(err, res, next);
  }
};
