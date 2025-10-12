/*
 * SPDX-License-Identifier: MIT
 */

import { parse } from 'csv-parse/sync';
import Asset from '../models/Asset';
import InventoryItem from '../models/InventoryItem';
import type { AuthedRequest, AuthedRequestHandler } from '../types/http';
import { sendResponse } from '../utils/sendResponse';

type FileUploadRequest = AuthedRequest & {
  file?: { buffer: Buffer };
};

export const importAssets: AuthedRequestHandler = async (req, res, next) => {
  try {
    const { file } = req as FileUploadRequest;
    if (!file) {
      sendResponse(res, null, 'CSV file required', 400);
      return;
    }
    const records = parse(file.buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const siteId = req.siteId;

    const docs = records.map((r: any) => ({
      name: r.name,
      type: r.type,
      location: r.location,
      description: r.description,
      tenantId,
      ...(siteId ? { siteId } : {}),
    }));

    const created = await Asset.insertMany(docs, { ordered: false });
    sendResponse(res, { imported: created.length });
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const importParts: AuthedRequestHandler = async (req, res, next) => {
  try {
    const { file } = req as FileUploadRequest;
    if (!file) {
      sendResponse(res, null, 'CSV file required', 400);
      return;
    }

    const records = parse(file.buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const siteId = req.siteId;

    const docs = records.map((r: any) => ({
      tenantId,
      ...(siteId ? { siteId } : {}),
      name: r.name,
      sku: r.sku,
      description: r.description,
      quantity: r.quantity ? Number(r.quantity) : 0,
      unitCost: r.unitCost ? Number(r.unitCost) : undefined,
      location: r.location,
    }));

    const created = await InventoryItem.insertMany(docs, { ordered: false });
    sendResponse(res, { imported: created.length });
    return;
  } catch (err) {
    next(err);
    return;
  }
};

