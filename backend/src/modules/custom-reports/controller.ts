/*
 * SPDX-License-Identifier: MIT
 */

import { sendResponse } from '../../../utils/sendResponse';
import type { AuthedRequestHandler } from '../../../types/http';
import type { ReportQueryRequest, ReportTemplateInput } from '../../../shared/reports';
import {
  exportCustomReport,
  getReportTemplate,
  listReportTemplates,
  runCustomReport,
  saveReportTemplate,
  updateReportTemplate,
} from './service';

export const runCustomReportHandler: AuthedRequestHandler<
  Record<string, string>,
  unknown,
  ReportQueryRequest
> = async (req, res, next) => {
  try {
    const tenantId = req.tenantId ?? req.user?.tenantId;
    if (!tenantId) throw new Error('Tenant context is required');
    const result = await runCustomReport(tenantId, req.body);
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const exportCustomReportHandler: AuthedRequestHandler<
  Record<string, string>,
  unknown,
  ReportQueryRequest & { format?: 'csv' | 'pdf' }
> = async (req, res, next) => {
  try {
    const tenantId = req.tenantId ?? req.user?.tenantId;
    if (!tenantId) throw new Error('Tenant context is required');
    const { buffer, filename, contentType } = await exportCustomReport(tenantId, req.body);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

export const listReportTemplatesHandler: AuthedRequestHandler = async (req, res, next) => {
  try {
    const templates = await listReportTemplates(req);
    sendResponse(res, templates);
  } catch (error) {
    next(error);
  }
};

export const createReportTemplateHandler: AuthedRequestHandler<
  Record<string, string>,
  unknown,
  ReportTemplateInput
> = async (req, res, next) => {
  try {
    const template = await saveReportTemplate(req, req.body);
    sendResponse(res, template, null, 201);
  } catch (error) {
    next(error);
  }
};

export const updateReportTemplateHandler: AuthedRequestHandler<
  { id: string },
  unknown,
  ReportTemplateInput
> = async (req, res, next) => {
  try {
    const template = await updateReportTemplate(req, req.params.id, req.body);
    sendResponse(res, template);
  } catch (error) {
    next(error);
  }
};

export const getReportTemplateHandler: AuthedRequestHandler = async (req, res, next) => {
  try {
    const template = await getReportTemplate(req, req.params.id);
    sendResponse(res, template);
  } catch (error) {
    next(error);
  }
};
