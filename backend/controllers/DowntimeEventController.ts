/*
 * SPDX-License-Identifier: MIT
 */

import type { Request, Response, NextFunction } from 'express';
import { Parser as Json2csvParser } from 'json2csv';
import { Types } from 'mongoose';

import { escapeXml, sendResponse, toEntityId, writeAuditLog } from '../utils';
import {
  createDowntimeEvent,
  deleteDowntimeEvent,
  getDowntimeEvent,
  listDowntimeEvents,
  updateDowntimeEvent,
} from '../services/downtimeEvents';

const parseDate = (value: unknown): Date | undefined => {
  if (typeof value !== 'string') return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const parseBoolean = (value: unknown): boolean | undefined => {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return undefined;
};

const buildFiltersFromRequest = (req: Request) => ({
  assetId: typeof req.query.assetId === 'string' ? req.query.assetId : undefined,
  workOrderId: typeof req.query.workOrderId === 'string' ? req.query.workOrderId : undefined,
  causeCode: typeof req.query.causeCode === 'string' ? req.query.causeCode : undefined,
  activeOnly: parseBoolean(req.query.activeOnly),
  start: parseDate(req.query.start),
  end: parseDate(req.query.end),
});

const toExportRows = (events: any[]) =>
  events.map((event) => {
    const start = event.start ? new Date(event.start) : undefined;
    const end = event.end ? new Date(event.end) : undefined;
    const durationMinutes =
      start && end ? Number(((end.getTime() - start.getTime()) / 60000).toFixed(2)) : '';

    return {
      assetId: event.assetId?.toString?.() ?? '',
      workOrderId: event.workOrderId?.toString?.() ?? '',
      start: start?.toISOString() ?? '',
      end: end?.toISOString() ?? '',
      causeCode: event.causeCode ?? '',
      reason: event.reason ?? '',
      impactMinutes: event.impactMinutes ?? '',
      durationMinutes,
    };
  });

export const getDowntimeEventsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }

    const filters = buildFiltersFromRequest(req);
    const events = await listDowntimeEvents(tenantId, filters);
    sendResponse(res, events);
  } catch (err) {
    next(err);
  }
};

export const exportDowntimeEventsCsvHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }

    const filters = buildFiltersFromRequest(req);
    const events = await listDowntimeEvents(tenantId, filters);
    const parser = new Json2csvParser({
      fields: [
        { label: 'Asset ID', value: 'assetId' },
        { label: 'Work Order ID', value: 'workOrderId' },
        { label: 'Start', value: 'start' },
        { label: 'End', value: 'end' },
        { label: 'Cause Code', value: 'causeCode' },
        { label: 'Reason', value: 'reason' },
        { label: 'Impact Minutes', value: 'impactMinutes' },
        { label: 'Duration (minutes)', value: 'durationMinutes' },
      ],
    });

    const csv = parser.parse(toExportRows(events));
    res.header('Content-Type', 'text/csv');
    res.attachment('downtime-events.csv');
    res.send(csv);
  } catch (err) {
    next(err);
  }
};

export const exportDowntimeEventsXlsxHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }

    const filters = buildFiltersFromRequest(req);
    const events = await listDowntimeEvents(tenantId, filters);
    const rows = toExportRows(events)
      .map((row) =>
        `<Row>${[
          row.assetId,
          row.workOrderId,
          row.start,
          row.end,
          row.causeCode,
          row.reason,
          row.impactMinutes,
          row.durationMinutes,
        ]
          .map((value) => `<Cell><Data ss:Type="String">${escapeXml(String(value))}</Data></Cell>`)
          .join('')}</Row>`,
      )
      .join('');

    const headers = ['Asset ID', 'Work Order ID', 'Start', 'End', 'Cause Code', 'Reason', 'Impact Minutes', 'Duration (minutes)'];
    const headerRow = headers
      .map((label) => `<Cell><Data ss:Type="String">${escapeXml(label)}</Data></Cell>`)
      .join('');
    const xml = `<?xml version="1.0"?>\n<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Downtime Events"><Table><Row>${headerRow}</Row>${rows}</Table></Worksheet></Workbook>`;

    res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.attachment('downtime-events.xlsx');
    res.send(xml);
  } catch (err) {
    next(err);
  }
};

export const getDowntimeEventHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const raw = req.params.id;
    const id = Array.isArray(raw) ? raw[0] : raw;
    const event = await getDowntimeEvent(tenantId, id);
    if (!event) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }

    sendResponse(res, event);
  } catch (err) {
    next(err);
  }
};

export const createDowntimeEventHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }

    if (!req.body?.assetId || !req.body?.start || !req.body?.causeCode || !req.body?.reason) {
      sendResponse(res, null, 'assetId, start, causeCode, and reason are required', 400);
      return;
    }

    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const created = await createDowntimeEvent(tenantId, req.body);
    await writeAuditLog({
      tenantId,
      userId,
      action: 'create',
      entityType: 'DowntimeEvent',
      entityId: toEntityId(created._id as Types.ObjectId),
      after: created.toObject(),
    });
    sendResponse(res, created, null, 201);
  } catch (err) {
    next(err);
  }
};

export const updateDowntimeEventHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const raw = req.params.id;
    const id = Array.isArray(raw) ? raw[0] : raw;

    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const before = await getDowntimeEvent(tenantId, id);
    if (!before) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }

    const updated = await updateDowntimeEvent(tenantId, id, req.body);
    await writeAuditLog({
      tenantId,
      userId,
      action: 'update',
      entityType: 'DowntimeEvent',
      entityId: toEntityId(new Types.ObjectId(id)),
      before: before.toObject?.() ?? before,
      after: updated?.toObject?.() ?? updated ?? undefined,
    });

    sendResponse(res, updated);
  } catch (err) {
    next(err);
  }
};

export const deleteDowntimeEventHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const raw = req.params.id;
    const id = Array.isArray(raw) ? raw[0] : raw;

    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const deleted = await deleteDowntimeEvent(tenantId, id);
    if (!deleted) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }

    await writeAuditLog({
      tenantId,
      userId,
      action: 'delete',
      entityType: 'DowntimeEvent',
      entityId: toEntityId(new Types.ObjectId(id)),
      before: deleted.toObject?.() ?? deleted,
    });

    sendResponse(res, { message: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
};
