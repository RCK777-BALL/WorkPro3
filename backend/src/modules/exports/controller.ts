/*
 * SPDX-License-Identifier: MIT
 */

import type { Response } from 'express';

import ExportJob from '../../../models/ExportJob';
import type { AuthedRequest, AuthedRequestHandler } from '../../../types/http';
import { fail } from '../../lib/http';
import { exportJobSchema } from './schemas';

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

export const listExportsHandler: AuthedRequestHandler = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  try {
    const jobs = await ExportJob.find({ tenantId: req.tenantId }).sort({ createdAt: -1 }).lean();
    send(res, jobs);
  } catch (err) {
    next(err);
  }
};

export const createExportHandler: AuthedRequestHandler = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  const parsed = exportJobSchema.safeParse(req.body);
  if (!parsed.success) {
    fail(res, parsed.error.errors.map((issue) => issue.message).join(', '), 400);
    return;
  }
  try {
    const job = await ExportJob.create({
      tenantId: req.tenantId,
      requestedBy: req.user?._id,
      type: parsed.data.type,
      format: parsed.data.format,
      status: 'queued',
      filters: parsed.data.filters,
    });
    send(res, job, 201);
  } catch (err) {
    next(err);
  }
};

export const downloadExportHandler: AuthedRequestHandler = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  try {
    const job = await ExportJob.findOne({ _id: req.params.id, tenantId: req.tenantId }).lean();
    if (!job || !job.filePath || !job.fileName || job.status !== 'completed') {
      fail(res, 'Export not ready', 404);
      return;
    }
    res.download(job.filePath, job.fileName);
  } catch (err) {
    next(err);
  }
};
