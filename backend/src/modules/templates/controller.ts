/*
 * SPDX-License-Identifier: MIT
 */

import type { Response, NextFunction } from 'express';

import type { AuthedRequest, AuthedRequestHandler } from '../../../types/http';
import { fail } from '../../lib/http';
import type { PMContext } from '../pm/service';
import { PMTemplateError } from '../pm/service';
import { cloneTemplateFromLibrary, listInspectionForms, listTemplateLibrary } from './service';
const buildContext = (req: AuthedRequest): PMContext => {
  const user = req.user as { _id?: string; id?: string } | undefined;
  const context: PMContext = {
    tenantId: req.tenantId!,
  };

  if (req.siteId) {
    context.siteId = req.siteId;
  }
  const userId = user?._id ?? user?.id;
  if (userId) {
    context.userId = userId;
  }

  return context;
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

export const listInspectionFormLibraryHandler: AuthedRequestHandler = (_req, res) => {
  send(res, listInspectionForms());
};

export const cloneTemplateHandler: AuthedRequestHandler<{ templateId: string }> = async (req, res, next) => {
  try {
    const data = await cloneTemplateFromLibrary(buildContext(req), req.params.templateId);
    send(res, data, 201);
  } catch (err) {
    handleError(err, res, next);
  }
};
