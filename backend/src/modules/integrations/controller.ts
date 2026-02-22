/*
 * SPDX-License-Identifier: MIT
 */

import type { Response, NextFunction } from 'express';
import { ZodError } from 'zod';

import type { AuthedRequest, AuthedRequestHandler } from '../../../types/http';
import { fail } from '../../lib/http';
import {
  IntegrationError,
  createApiKey,
  listNotificationProviders,
  listApiKeys,
  revokeApiKey,
  sendNotificationTest,
  type NotificationTestInput,
  syncCostsWithAccounting,
  syncPurchaseOrdersWithAccounting,
  syncVendorsWithAccounting,
} from './service';
import { apiKeySchema, apiKeyScopes, accountingProviderSchema, accountingSyncSchema, notificationTestSchema } from './schemas';

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
  if (err instanceof ZodError) {
    fail(res, err.errors.map((issue) => issue.message).join(', '), 400);
    return;
  }
  next(err);
};

export const listNotificationProvidersHandler: AuthedRequestHandler = async (req, res, next) => {
  try {
    const providers = listNotificationProviders();
    send(res, providers);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const sendNotificationTestHandler: AuthedRequestHandler = async (req, res, next) => {
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

const parseProvider = (value: string | undefined) => accountingProviderSchema.parse(value);

export const syncVendorsHandler: AuthedRequestHandler = async (req, res, next) => {
  try {
    const raw = req.params.provider;
    const providerVal = Array.isArray(raw) ? raw[0] : raw;

    const provider = parseProvider(providerVal);
    const payload = accountingSyncSchema.parse({ provider, payload: req.body }).payload;
    const result = syncVendorsWithAccounting(provider, payload);
    send(res, result, 202);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const syncPurchaseOrdersHandler: AuthedRequestHandler = async (req, res, next) => {
  try {
    const raw = req.params.provider;
    const providerRaw = Array.isArray(raw) ? raw[0] : raw;
    const provider = parseProvider(providerRaw);
    const payload = accountingSyncSchema.parse({ provider, payload: req.body }).payload;
    const result = syncPurchaseOrdersWithAccounting(provider, payload);
    send(res, result, 202);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const syncCostsHandler: AuthedRequestHandler = async (req, res, next) => {
  try {
    const raw = req.params.provider;
    const providerRaw = Array.isArray(raw) ? raw[0] : raw;
    const provider = parseProvider(providerRaw);
    const payload = accountingSyncSchema.parse({ provider, payload: req.body }).payload;
    const result = syncCostsWithAccounting(provider, payload);
    send(res, result, 202);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const listApiKeyScopesHandler: AuthedRequestHandler = async (_req, res) => {
  send(res, apiKeyScopes);
};

export const listApiKeysHandler: AuthedRequestHandler = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  try {
    const keys = await listApiKeys(req.tenantId);
    send(res, keys);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const createApiKeyHandler: AuthedRequestHandler = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  const parse = apiKeySchema.safeParse(req.body);
  if (!parse.success) {
    fail(res, parse.error.errors.map((issue) => issue.message).join(', '), 400);
    return;
  }
  try {
    const result = await createApiKey({
      tenantId: req.tenantId,
      name: parse.data.name,
      rateLimitMax: parse.data.rateLimitMax,
      scopes: parse.data.scopes,
      createdBy: req.user?._id ? String(req.user._id) : undefined,
    });
    send(res, { apiKey: result.apiKey, token: result.token }, 201);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const revokeApiKeyHandler: AuthedRequestHandler = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  try {
    const raw = req.params.id;
    const id = Array.isArray(raw) ? raw[0] : raw;
    const key = await revokeApiKey(req.tenantId, id);
    if (!key) {
      fail(res, 'API key not found', 404);
      return;
    }
    send(res, key);
  } catch (err) {
    handleError(err, res, next);
  }
};
