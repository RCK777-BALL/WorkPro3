/*
 * SPDX-License-Identifier: MIT
 */

import type { Response } from 'express';

import type { AuthedRequest, AuthedRequestHandler } from '../../../types/http';
import { fail } from '../../lib/http';
import { webhookEventSchema, webhookSubscriptionSchema } from './schemas';
import { createSubscription, deleteSubscription, dispatchEvent, listSubscriptions } from './service';

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

export const listSubscriptionsHandler: AuthedRequestHandler = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  try {
    const hooks = await listSubscriptions(req.tenantId);
    send(res, hooks);
  } catch (err) {
    next(err);
  }
};

export const createSubscriptionHandler: AuthedRequestHandler = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  const parsed = webhookSubscriptionSchema.safeParse(req.body);
  if (!parsed.success) {
    fail(res, parsed.error.errors.map((issue) => issue.message).join(', '), 400);
    return;
  }
  try {
    const { subscription, secret } = await createSubscription({
      tenantId: req.tenantId,
      name: parsed.data.name,
      url: parsed.data.url,
      events: parsed.data.events,
      active: parsed.data.active,
      maxAttempts: parsed.data.maxAttempts,
    });
    send(res, { subscription, secret }, 201);
  } catch (err) {
    next(err);
  }
};

export const deleteSubscriptionHandler: AuthedRequestHandler = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  try {
    const deleted = await deleteSubscription(req.tenantId, req.params.id);
    if (!deleted) {
      fail(res, 'Webhook not found', 404);
      return;
    }
    send(res, { deleted: true });
  } catch (err) {
    next(err);
  }
};

export const dispatchWebhookHandler: AuthedRequestHandler = async (req, res, next) => {
  const parsed = webhookEventSchema.safeParse(req.body);
  if (!parsed.success) {
    fail(res, parsed.error.errors.map((issue) => issue.message).join(', '), 400);
    return;
  }
  try {
    await dispatchEvent(parsed.data.event, parsed.data.payload ?? {});
    send(res, { status: 'queued' }, 202);
  } catch (err) {
    next(err);
  }
};
