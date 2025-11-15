/*
 * SPDX-License-Identifier: MIT
 */

import type { Response, NextFunction } from 'express';

import type { AuthedRequest, AuthedRequestHandler } from '../../../types/http';
import { fail } from '../../lib/http';
import {
  IntegrationError,
  listNotificationProviders,
  sendNotificationTest,
  type NotificationTestInput,
} from './service';
import { notificationTestSchema } from './schemas';

const ensureTenant = (req: AuthedRequest, res: Response): req is AuthedRequest & { tenantId: string } => {
  if (!req.tenantId) {
    fail(res, 'Tenant context is required', 400);
    return false;
  }
  return true;
};

const send = (res: Response, data: unknown, status = 200) => {
  res.status(status).json({ success: true, data });
};

const handleError = (err: unknown, res: Response, next: NextFunction) => {
  if (err instanceof IntegrationError) {
    fail(res, err.message, err.status);
    return;
  }
  next(err);
};

export const listNotificationProvidersHandler: AuthedRequestHandler = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  try {
    const providers = listNotificationProviders();
    send(res, providers);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const sendNotificationTestHandler: AuthedRequestHandler = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  const parse = notificationTestSchema.safeParse(req.body);
  if (!parse.success) {
    fail(res, parse.error.errors.map((error) => error.message).join(', '), 400);
    return;
  }
  try {
    const result = await sendNotificationTest(parse.data as NotificationTestInput);
    send(res, result, 201);
  } catch (err) {
    handleError(err, res, next);
  }
};
