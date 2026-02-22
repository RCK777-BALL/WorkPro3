/*
 * SPDX-License-Identifier: MIT
 */

import { sendResponse } from '../../../utils/sendResponse';
import type { AuthedRequest, AuthedRequestHandler } from '../../../types/http';
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
    const result = await runCustomReport(req.tenantId!, req.body);
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
    const { buffer, filename, contentType } = await exportCustomReport(req.tenantId!, req.body);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

export const listReportTemplatesHandler: AuthedRequestHandler = async (req, res, next) => {
  try {
    const authedReq = req as AuthedRequest;
    const templates = await listReportTemplates(authedReq);
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
    const authedReq = req as AuthedRequest;
    // ✅ use the typed req.body (ReportTemplateInput), not authedReq.body (unknown)
    const template = await saveReportTemplate(authedReq, req.body);
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
    const authedReq = req as AuthedRequest;
    // ✅ use the typed req.body (ReportTemplateInput), not authedReq.body (unknown)
    const template = await updateReportTemplate(authedReq, req.params.id, req.body);
    sendResponse(res, template);
  } catch (error) {
    next(error);
  }
};

export const getReportTemplateHandler: AuthedRequestHandler = async (req, res, next) => {
  try {
    const authedReq = req as AuthedRequest;
    const raw = authedReq.params.id;
    const id = Array.isArray(raw) ? raw[0] : raw;
    const template = await getReportTemplate(authedReq, id);
    sendResponse(res, template);
  } catch (error) {
    next(error);
  }
};
