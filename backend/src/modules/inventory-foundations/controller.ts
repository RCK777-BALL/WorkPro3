/*
 * SPDX-License-Identifier: MIT
 */

import type { Response, NextFunction } from 'express';

import type { AuthedRequest, AuthedRequestHandler } from '../../../types/http';
import { fail } from '../../lib/http';
import {
  InventoryFoundationError,
  adjustStock,
  deleteLocation,
  deletePart,
  deletePartStock,
  getLocation,
  getPart,
  getPartStock,
  listLocations,
  listPartStocks,
  listParts,
  receiveStock,
  saveLocation,
  savePart,
  savePartStock,
  type InventoryFoundationContext,
} from './service';
const buildContext = (req: AuthedRequest): InventoryFoundationContext => {
  const userId =
    typeof req.user?.id === 'string'
      ? req.user.id
      : typeof req.user?._id === 'string'
        ? req.user._id
        : undefined;
  return {
    tenantId: req.tenantId!,
    siteId: req.siteId ?? undefined,
    userId,
  };
};

const handleError = (err: unknown, res: Response, next: NextFunction) => {
  if (err instanceof InventoryFoundationError) {
    fail(res, err.message, err.status);
    return;
  }
  next(err);
};

const parseTags = (value: unknown): string[] | undefined => {
  if (!value) return undefined;
  if (Array.isArray(value)) return value.filter((tag): tag is string => typeof tag === 'string');
  if (typeof value === 'string') return value.split(',').map((tag) => tag.trim()).filter(Boolean);
  return undefined;
};

const parseBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return undefined;
};

const parseNumber = (value: unknown): number | undefined => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const listPartsHandler: AuthedRequestHandler = async (req, res, next) => {
  try {
    const data = await listParts(buildContext(req), {
      page: parseNumber(req.query.page),
      pageSize: parseNumber(req.query.pageSize),
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
      tags: parseTags(req.query.tags),
      includeDeleted: parseBoolean(req.query.includeDeleted),
    });
    res.json(data);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const getPartHandler: AuthedRequestHandler<{ partId: string }> = async (req, res, next) => {
  try {
    const data = await getPart(buildContext(req), req.params.partId, parseBoolean(req.query.includeDeleted));
    res.json(data);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const savePartHandler: AuthedRequestHandler<{ partId?: string }> = async (req, res, next) => {
  const body = typeof req.body === 'object' && req.body ? (req.body as Record<string, unknown>) : {};
  if (typeof body.name !== 'string' || !body.name.trim()) {
    fail(res, 'Name is required', 400);
    return;
  }
  try {
    const data = await savePart(
      buildContext(req),
      {
        name: body.name,
        description: typeof body.description === 'string' ? body.description : undefined,
        sku: typeof body.sku === 'string' ? body.sku : undefined,
        barcode: typeof body.barcode === 'string' ? body.barcode : undefined,
        unitOfMeasure: typeof body.unitOfMeasure === 'string' ? body.unitOfMeasure : undefined,
        unitCost: parseNumber(body.unitCost),
        reorderPoint: parseNumber(body.reorderPoint),
        reorderQty: parseNumber(body.reorderQty),
        preferredVendorId: typeof body.preferredVendorId === 'string' ? body.preferredVendorId : undefined,
        tags: parseTags(body.tags),
        attachments: Array.isArray(body.attachments)
          ? (body.attachments.filter((att) => typeof att === 'object' && att !== null) as {
              name?: string;
              url?: string;
            }[])
          : undefined,
      },
      req.params.partId,
    );
    res.status(req.params.partId ? 200 : 201).json(data);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const deletePartHandler: AuthedRequestHandler<{ partId: string }> = async (req, res, next) => {
  try {
    const data = await deletePart(buildContext(req), req.params.partId);
    res.json(data);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const listLocationsHandler: AuthedRequestHandler = async (req, res, next) => {
  try {
    const result = await listLocations(buildContext(req), {
      page: parseNumber(req.query.page),
      pageSize: parseNumber(req.query.pageSize),
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
      tags: parseTags(req.query.tags),
      includeDeleted: parseBoolean(req.query.includeDeleted),
      tree: parseBoolean(req.query.tree),
    });
    res.json(result);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const getLocationHandler: AuthedRequestHandler<{ locationId: string }> = async (req, res, next) => {
  try {
    const data = await getLocation(buildContext(req), req.params.locationId, parseBoolean(req.query.includeDeleted));
    res.json(data);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const saveLocationHandler: AuthedRequestHandler<{ locationId?: string }> = async (req, res, next) => {
  const body = typeof req.body === 'object' && req.body ? (req.body as Record<string, unknown>) : {};
  if (typeof body.name !== 'string' || !body.name.trim()) {
    fail(res, 'Name is required', 400);
    return;
  }
  try {
    const data = await saveLocation(
      buildContext(req),
      {
        name: body.name,
        code: typeof body.code === 'string' ? body.code : undefined,
        parentId: typeof body.parentId === 'string' ? body.parentId : undefined,
        tags: parseTags(body.tags),
      },
      req.params.locationId,
    );
    res.status(req.params.locationId ? 200 : 201).json(data);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const deleteLocationHandler: AuthedRequestHandler<{ locationId: string }> = async (req, res, next) => {
  try {
    const data = await deleteLocation(buildContext(req), req.params.locationId);
    res.json(data);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const listPartStocksHandler: AuthedRequestHandler = async (req, res, next) => {
  try {
    const data = await listPartStocks(buildContext(req), {
      page: parseNumber(req.query.page),
      pageSize: parseNumber(req.query.pageSize),
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
      tags: parseTags(req.query.tags),
      includeDeleted: parseBoolean(req.query.includeDeleted),
    });
    res.json(data);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const getPartStockHandler: AuthedRequestHandler<{ stockId: string }> = async (req, res, next) => {
  try {
    const data = await getPartStock(buildContext(req), req.params.stockId, parseBoolean(req.query.includeDeleted));
    res.json(data);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const savePartStockHandler: AuthedRequestHandler<{ stockId?: string }> = async (req, res, next) => {
  const body = typeof req.body === 'object' && req.body ? (req.body as Record<string, unknown>) : {};
  if (typeof body.partId !== 'string' || typeof body.locationId !== 'string') {
    fail(res, 'partId and locationId are required', 400);
    return;
  }
  try {
    const data = await savePartStock(
      buildContext(req),
      {
        partId: body.partId,
        locationId: body.locationId,
        onHand: parseNumber(body.onHand),
        reserved: parseNumber(body.reserved),
        minQty: parseNumber(body.minQty),
        maxQty: parseNumber(body.maxQty),
        tags: parseTags(body.tags),
      },
      req.params.stockId,
    );
    res.status(req.params.stockId ? 200 : 201).json(data);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const deletePartStockHandler: AuthedRequestHandler<{ stockId: string }> = async (req, res, next) => {
  try {
    const data = await deletePartStock(buildContext(req), req.params.stockId);
    res.json(data);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const adjustStockHandler: AuthedRequestHandler<{ stockId: string }> = async (req, res, next) => {
  const body = typeof req.body === 'object' && req.body ? (req.body as Record<string, unknown>) : {};
  try {
    const data = await adjustStock(
      buildContext(req),
      req.params.stockId,
      {
        delta: parseNumber(body.delta),
        newOnHand: parseNumber(body.newOnHand),
        reason: typeof body.reason === 'string' ? body.reason : undefined,
        minQty: parseNumber(body.minQty),
        maxQty: parseNumber(body.maxQty),
        recountNote: typeof body.recountNote === 'string' ? body.recountNote : undefined,
        recountedAt: body.recountedAt ? new Date(body.recountedAt as string) : undefined,
        recountedBy: typeof body.recountedBy === 'string' ? body.recountedBy : undefined,
      },
    );
    res.json(data);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const receiveStockHandler: AuthedRequestHandler<{ stockId: string }> = async (req, res, next) => {
  const body = typeof req.body === 'object' && req.body ? (req.body as Record<string, unknown>) : {};
  const qty = parseNumber(body.quantity);
  if (qty === undefined) {
    fail(res, 'quantity is required', 400);
    return;
  }
  try {
    const data = await receiveStock(
      buildContext(req),
      req.params.stockId,
      {
        quantity: qty,
        reason: typeof body.reason === 'string' ? body.reason : undefined,
        minQty: parseNumber(body.minQty),
        maxQty: parseNumber(body.maxQty),
        receivedAt: body.receivedAt ? new Date(body.receivedAt as string) : undefined,
        receivedBy: typeof body.receivedBy === 'string' ? body.receivedBy : undefined,
      },
    );
    res.json(data);
  } catch (err) {
    handleError(err, res, next);
  }
};
