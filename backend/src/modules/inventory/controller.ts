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
  listLocations,
  saveLocation,
  listStockItems,
  adjustStock,
  transferStock,
  listStockHistory,
  transitionPurchaseOrder,
  InventoryError,
  type InventoryContext,
  type PartUsageFilters,
  type PurchaseOrderExportFormat,
  getPartUsageReport,
} from './service';
import {
  locationInputSchema,
  partInputSchema,
  purchaseOrderInputSchema,
  purchaseOrderStatusSchema,
  stockAdjustmentSchema,
  inventoryTransferSchema,
  vendorInputSchema,
} from './schemas';

const ensureTenant = (req: AuthedRequest, res: Response): req is AuthedRequest & { tenantId: string } => {
  if (!req.tenantId) {
    fail(res, 'Tenant context is required', 400);
    return false;
  }
  return true;
};

const buildContext = (req: AuthedRequest): InventoryContext => {
  const context: InventoryContext = {
    tenantId: req.tenantId!,
  };

  if (typeof req.siteId === 'string' && req.siteId.length > 0) {
    context.siteId = req.siteId;
  }

  if (req.user && typeof req.user === 'object') {
    const { id, _id } = req.user as { id?: string; _id?: string };
    const userId = typeof id === 'string' ? id : typeof _id === 'string' ? _id : undefined;
    if (userId) {
      context.userId = userId;
    }
  }

  return context;
};

const send = (res: Response, data: unknown, status = 200) => {
  res.status(status).json({ success: true, data });
};

const normalizeFormat = (value: unknown): PurchaseOrderExportFormat | null => {
  if (typeof value !== 'string') return null;
  if (value.toLowerCase() === 'pdf') return 'pdf';
  if (value.toLowerCase() === 'csv') return 'csv';
  return null;
};

const parseDate = (value: unknown): Date | undefined => {
  if (typeof value !== 'string') return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
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
    const toNumber = (value: unknown, fallback: number) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
    };
    const data = await listParts(buildContext(req), {
      page: toNumber(req.query.page, 1),
      pageSize: Math.min(toNumber(req.query.pageSize, 25), 200),
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
      vendorId: typeof req.query.vendorId === 'string' ? req.query.vendorId : undefined,
      sortBy: typeof req.query.sortBy === 'string' ? req.query.sortBy : undefined,
      sortDirection: req.query.sortDirection === 'desc' ? 'desc' : 'asc',
    });
    send(res, data);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const savePartHandler: AuthedRequestHandler<{ partId?: string }> = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  const rawBody = (typeof req.body === 'object' && req.body !== null ? req.body : {}) as Record<string, unknown>;
  const partName =
    typeof rawBody.name === 'string'
      ? rawBody.name
      : typeof rawBody.title === 'string'
        ? rawBody.title
        : undefined;
  const parse = partInputSchema.safeParse({ ...rawBody, name: partName });
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

export const listLocationsHandler: AuthedRequestHandler = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  try {
    const data = await listLocations(buildContext(req));
    send(res, data);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const saveLocationHandler: AuthedRequestHandler<{ locationId?: string }> = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  const rawBody = (typeof req.body === 'object' && req.body !== null ? req.body : {}) as Record<string, unknown>;
  const parse = locationInputSchema.safeParse(rawBody);
  if (!parse.success) {
    fail(res, parse.error.errors.map((error) => error.message).join(', '), 400);
    return;
  }
  try {
    const data = await saveLocation(buildContext(req), parse.data, req.params.locationId);
    send(res, data, req.params.locationId ? 200 : 201);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const listStockItemsHandler: AuthedRequestHandler = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  try {
    const data = await listStockItems(buildContext(req));
    send(res, data);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const adjustStockHandler: AuthedRequestHandler = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  const rawBody = (typeof req.body === 'object' && req.body !== null ? req.body : {}) as Record<string, unknown>;
  const parse = stockAdjustmentSchema.safeParse(rawBody);
  if (!parse.success) {
    fail(res, parse.error.errors.map((error) => error.message).join(', '), 400);
    return;
  }
  try {
    const data = await adjustStock(buildContext(req), parse.data);
    send(res, data, 200);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const transferStockHandler: AuthedRequestHandler = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  const rawBody = (typeof req.body === 'object' && req.body !== null ? req.body : {}) as Record<string, unknown>;
  const parse = inventoryTransferSchema.safeParse(rawBody);
  if (!parse.success) {
    fail(res, parse.error.errors.map((error) => error.message).join(', '), 400);
    return;
  }
  try {
    const data = await transferStock(buildContext(req), parse.data);
    send(res, data, 201);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const listStockHistoryHandler: AuthedRequestHandler = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  try {
    const data = await listStockHistory(buildContext(req));
    send(res, data);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const partUsageReportHandler: AuthedRequestHandler = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  const filters: PartUsageFilters = {
    startDate: parseDate(req.query.startDate),
    endDate: parseDate(req.query.endDate),
    partIds: toIdArray(req.query.partIds ?? req.query.partId),
    siteIds: toIdArray(req.query.siteIds ?? req.query.siteId),
  };
  try {
    const data = await getPartUsageReport(buildContext(req), filters);
    send(res, data);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const transitionPurchaseOrderHandler: AuthedRequestHandler<{ purchaseOrderId: string }> = async (
  req,
  res,
  next,
) => {
  if (!ensureTenant(req, res)) return;
  const rawBody = (typeof req.body === 'object' && req.body !== null ? req.body : {}) as Record<string, unknown>;
  const parse = purchaseOrderStatusSchema.safeParse(rawBody);
  if (!parse.success) {
    fail(res, parse.error.errors.map((error) => error.message).join(', '), 400);
    return;
  }
  try {
    const data = await transitionPurchaseOrder(buildContext(req), req.params.purchaseOrderId, parse.data);
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
