/*
 * SPDX-License-Identifier: MIT
 */

import type { Express, Response, NextFunction } from 'express';

import type { AuthedRequest, AuthedRequestHandler } from '../../../types/http';
import { fail } from '../../lib/http';
import {
  ImportExportError,
  generateAssetExport,
  summarizeImport,
  type ExportFormat,
} from './service';

type Context = {
  tenantId: string;
  plantId?: string;
  siteId?: string;
};

type UploadRequest = AuthedRequest & { file?: Express.Multer.File };

type ExportQuery = { format?: string };

const ensureTenant = (req: AuthedRequest, res: Response): string | undefined => {
  if (!req.tenantId) {
    fail(res, 'Tenant context is required to perform import/export operations.', 400);
    return undefined;
  }
  return req.tenantId;
};

const buildContext = (req: AuthedRequest): Context => ({
  tenantId: req.tenantId!,
  plantId: req.plantId,
  siteId: req.siteId,
});

const parseFormat = (value?: string): ExportFormat | undefined => {
  if (!value) return 'xlsx';
  const normalized = value.toLowerCase();
  if (normalized === 'csv' || normalized === 'xlsx') {
    return normalized;
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

export const exportAssets: AuthedRequestHandler<unknown, unknown, unknown, ExportQuery> = async (
  req,
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

export const importAssets: AuthedRequestHandler = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  const file = (req as UploadRequest).file;
  if (!file) {
    fail(res, 'Please include a CSV or XLSX file in the "file" field.', 400);
    return;
  }

  try {
    const summary = summarizeImport(file);
    res.json({ success: true, data: summary });
  } catch (err) {
    handleError(err, res, next);
  }
};
