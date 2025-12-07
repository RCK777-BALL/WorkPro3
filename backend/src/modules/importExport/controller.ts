/*
 * SPDX-License-Identifier: MIT
 */

import type { Express, Response, NextFunction } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';

import type { AuthedRequest, AuthedRequestHandler } from '../../../types/http';
import { fail } from '../../lib/http';
import {
  ImportExportError,
  generateAssetExport,
  summarizeImport,
  type ImportEntity,
  type ExportFormat,
} from './service';

type Context = {
  tenantId: string;
  plantId?: string;
  siteId?: string;
};

type UploadRequest = AuthedRequest & { file?: Express.Multer.File };
type ImportParams = ParamsDictionary & { entity: ImportEntity };

type ExportQuery = ParsedQs & { format?: string };

const ensureTenant = (req: AuthedRequest, res: Response): string | undefined => {
  if (!req.tenantId) {
    fail(res, 'Tenant context is required to perform import/export operations.', 400);
    return undefined;
  }
  return req.tenantId;
};

const buildContext = (req: AuthedRequest): Context => {
  const context: Context = {
    tenantId: req.tenantId!,
  };

  if (req.plantId) {
    context.plantId = req.plantId;
  }

  if (req.siteId) {
    context.siteId = req.siteId;
  }

  return context;
};

const parseFormat = (value?: string): ExportFormat | undefined => {
  if (!value) return 'xlsx';
  const normalized = value.toLowerCase();
  if (normalized === 'csv' || normalized === 'xlsx') {
    return normalized;
  }
  return undefined;
};

const parseEntity = (value?: string): ImportEntity | undefined => {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  if (normalized === 'assets' || normalized === 'pms' || normalized === 'workorders' || normalized === 'parts') {
    return normalized === 'workorders' ? 'workOrders' : (normalized as ImportEntity);
  }
  return undefined;
};

const handleError = (err: unknown, res: Response, next: NextFunction) => {
  if (err instanceof ImportExportError) {
    fail(res, err.message, err.status);
    return;
  }
  next(err);
};

export const exportAssets: AuthedRequestHandler<ParamsDictionary, unknown, unknown, ExportQuery> = async (
  req: AuthedRequest<ParamsDictionary, unknown, unknown, ExportQuery>,
  res,
  next,
) => {
  if (!ensureTenant(req, res)) return;
  const format = parseFormat(req.query.format as string | undefined);
  if (!format) {
    fail(res, 'Only csv or xlsx exports are supported.', 400);
    return;
  }

  try {
    const { buffer, filename, mimeType } = await generateAssetExport(buildContext(req), format);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const importEntities: AuthedRequestHandler<ImportParams> = async (
  req: AuthedRequest<ImportParams>,
  res,
  next,
) => {
  if (!ensureTenant(req, res)) return;
  const file = (req as UploadRequest).file;
  if (!file) {
    fail(res, 'Please include a CSV or XLSX file in the "file" field.', 400);
    return;
  }

  const entity = parseEntity(req.params.entity);
  if (!entity) {
    fail(res, 'Unsupported import type. Use assets, pms, workOrders, or parts.', 400);
    return;
  }

  try {
    const summary = summarizeImport(file, entity);
    res.json({ success: true, data: summary });
  } catch (err) {
    handleError(err, res, next);
  }
};
