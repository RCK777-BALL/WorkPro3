/*
 * SPDX-License-Identifier: MIT
 */

import type { Response, NextFunction } from 'express';

import type { AuthedRequest, AuthedRequestHandler } from '../../../types/http';
import { fail } from '../../lib/http';
import {
  listParts,
  savePart,
  listVendors,
  saveVendor,
  listAlerts,
  createPurchaseOrder,
  listPurchaseOrders,
  exportPurchaseOrders,
  InventoryError,
  type InventoryContext,
  type PurchaseOrderExportFormat,
} from './service';
import { partInputSchema, purchaseOrderInputSchema, vendorInputSchema } from './schemas';

const ensureTenant = (req: AuthedRequest, res: Response): req is AuthedRequest & { tenantId: string } => {
  if (!req.tenantId) {
    fail(res, 'Tenant context is required', 400);
    return false;
  }
  return true;
};

const buildContext = (req: AuthedRequest): InventoryContext => ({
  tenantId: req.tenantId!,
  siteId: req.siteId,
  userId: req.user && typeof req.user === 'object' ? (req.user as { id?: string; _id?: string }).id : undefined,
});

const send = (res: Response, data: unknown, status = 200) => {
  res.status(status).json({ success: true, data });
};

const normalizeFormat = (value: unknown): PurchaseOrderExportFormat | null => {
  if (typeof value !== 'string') return null;
  if (value.toLowerCase() === 'pdf') return 'pdf';
  if (value.toLowerCase() === 'csv') return 'csv';
  return null;
};

const toIdArray = (value: unknown): string[] | undefined => {
  if (!value) return undefined;
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === 'string' ? entry : undefined))
      .filter((entry): entry is string => Boolean(entry));
  }
  return typeof value === 'string' ? [value] : undefined;
};

const handleError = (err: unknown, res: Response, next: NextFunction) => {
  if (err instanceof InventoryError) {
    fail(res, err.message, err.status);
    return;
  }
  next(err);
};

export const listPartsHandler: AuthedRequestHandler = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  try {
    const data = await listParts(buildContext(req));
    send(res, data);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const savePartHandler: AuthedRequestHandler<{ partId?: string }> = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  const parse = partInputSchema.safeParse({ ...req.body, name: req.body?.name ?? req.body?.title });
  if (!parse.success) {
    fail(res, parse.error.errors.map((error) => error.message).join(', '), 400);
    return;
  }
  try {
    const data = await savePart(buildContext(req), parse.data, req.params.partId);
    send(res, data, req.params.partId ? 200 : 201);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const listVendorsHandler: AuthedRequestHandler = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  try {
    const data = await listVendors(buildContext(req));
    send(res, data);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const saveVendorHandler: AuthedRequestHandler<{ vendorId?: string }> = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  const parse = vendorInputSchema.safeParse(req.body);
  if (!parse.success) {
    fail(res, parse.error.errors.map((error) => error.message).join(', '), 400);
    return;
  }
  try {
    const data = await saveVendor(buildContext(req), parse.data, req.params.vendorId);
    send(res, data, req.params.vendorId ? 200 : 201);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const listAlertsHandler: AuthedRequestHandler = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  try {
    const data = await listAlerts(buildContext(req));
    send(res, data);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const createPurchaseOrderHandler: AuthedRequestHandler = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  const parse = purchaseOrderInputSchema.safeParse(req.body);
  if (!parse.success) {
    fail(res, parse.error.errors.map((error) => error.message).join(', '), 400);
    return;
  }
  try {
    const data = await createPurchaseOrder(buildContext(req), parse.data);
    send(res, data, 201);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const listPurchaseOrdersHandler: AuthedRequestHandler = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  try {
    const data = await listPurchaseOrders(buildContext(req));
    send(res, data);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const exportPurchaseOrdersHandler: AuthedRequestHandler = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  const formatInput = req.query.format;
  const normalized = formatInput ? normalizeFormat(formatInput) : 'csv';
  if (!normalized) {
    fail(res, 'format must be csv or pdf', 400);
    return;
  }
  try {
    const { buffer, filename, mimeType } = await exportPurchaseOrders(
      buildContext(req),
      normalized,
      toIdArray(req.query.purchaseOrderId ?? req.query.purchaseOrderIds),
    );
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    handleError(err, res, next);
  }
};
