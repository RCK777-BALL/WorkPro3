/*
 * SPDX-License-Identifier: MIT
 */

import type { Request } from 'express';

import sendResponse from '../../../utils/sendResponse';
import type { AuthedRequestHandler } from '../../../types/http';
import {
  getExecutiveKpiTrends,
  renderExecutiveReportPdf,
  getExecutiveReportSchedule,
  saveExecutiveReportSchedule,
  ExecutiveScheduleError,
  type UpdateExecutiveScheduleInput,
} from './service';

const parseMonths = (value: unknown): number | undefined => {
  if (typeof value !== 'string') return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
};

const parseRecipients = (value: unknown): string[] | undefined => {
  if (value == null) return undefined;
  if (Array.isArray(value)) {
    const normalized = value
      .flatMap((entry) => (typeof entry === 'string' ? entry.split(/[;,]/) : []))
      .map((entry) => entry.trim())
      .filter(Boolean);
    return normalized.length ? normalized : [];
  }
  if (typeof value === 'string') {
    const normalized = value
      .split(/[;,]/)
      .map((entry) => entry.trim())
      .filter(Boolean);
    return normalized.length ? normalized : [];
  }
  return [];
};

export const getExecutiveTrendsHandler: AuthedRequestHandler = async (req, res, next) => {
  try {
    const months = parseMonths(req.query.months);
    const data = await getExecutiveKpiTrends(req.tenantId!, months);
    sendResponse(res, data);
  } catch (err) {
    next(err);
  }
};

export const renderExecutiveReportHandler: AuthedRequestHandler = async (req, res, next) => {
  try {
    const months = parseMonths((req.body as Request['body'])?.months ?? req.query.months);
    const artifact = await renderExecutiveReportPdf(req.tenantId!, months);
    res.setHeader('Content-Type', artifact.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${artifact.filename}"`);
    res.send(artifact.buffer);
  } catch (err) {
    next(err);
  }
};

export const getExecutiveScheduleHandler: AuthedRequestHandler = async (req, res, next) => {
  try {
    const schedule = await getExecutiveReportSchedule(req.tenantId!);
    sendResponse(res, schedule);
  } catch (err) {
    next(err);
  }
};

export const updateExecutiveScheduleHandler: AuthedRequestHandler = async (req, res, next) => {
  try {
    const body = req.body as Partial<UpdateExecutiveScheduleInput> & { recipients?: unknown };
    const payload: UpdateExecutiveScheduleInput = {
      enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined,
      cron: typeof body.cron === 'string' ? body.cron : undefined,
      timezone: typeof body.timezone === 'string' ? body.timezone : undefined,
      recipients: parseRecipients(body.recipients),
    };
    const schedule = await saveExecutiveReportSchedule(req.tenantId!, payload);
    sendResponse(res, schedule);
  } catch (err) {
    if (err instanceof ExecutiveScheduleError) {
      sendResponse(res, null, err.message, err.status);
      return;
    }
    next(err);
  }
};
