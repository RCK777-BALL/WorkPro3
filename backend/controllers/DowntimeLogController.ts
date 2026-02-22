/*
 * SPDX-License-Identifier: MIT
 */

import type { Request, Response, NextFunction } from 'express';
import { Parser as Json2csvParser } from 'json2csv';
import { Types } from 'mongoose';

import { escapeXml, sendResponse, writeAuditLog, toEntityId } from '../utils';
import {
  createDowntimeLog,
  deleteDowntimeLog,
  getDowntimeLog,
  listDowntimeLogs,
  updateDowntimeLog,
} from '../services/downtimeLogs';
import { createNotification } from '../services/notificationService';

const parseDate = (value: unknown): Date | undefined => {
  if (typeof value !== 'string') return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const buildFiltersFromRequest = (req: Request) => ({
  assetId: typeof req.query.assetId === 'string' ? req.query.assetId : undefined,
  start: parseDate(req.query.start),
  end: parseDate(req.query.end),
});

export const getDowntimeLogsHandler = async (
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
    const logs = await listDowntimeLogs(tenantId, filters);
    sendResponse(res, logs);
  } catch (err) {
    next(err);
  }
};

export const exportDowntimeLogsHandler = async (
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
    const logs = await listDowntimeLogs(tenantId, filters);

    const parser = new Json2csvParser({
      fields: [
        { label: 'Asset ID', value: 'assetId' },
        { label: 'Start', value: 'start' },
        { label: 'End', value: 'end' },
        { label: 'Duration (minutes)', value: 'durationMinutes' },
        { label: 'Reason', value: 'reason' },
      ],
    });

    const rows = logs.map((log) => {
      const start = log.start ? new Date(log.start) : undefined;
      const end = log.end ? new Date(log.end) : undefined;
      const durationMinutes = start && end ? Number(((end.getTime() - start.getTime()) / 60000).toFixed(2)) : '';

      return {
        assetId: log.assetId?.toString?.() ?? '',
        start: start?.toISOString() ?? '',
        end: end?.toISOString() ?? '',
        durationMinutes,
        reason: log.reason ?? '',
      };
    });

    const csv = parser.parse(rows);
    res.header('Content-Type', 'text/csv');
    res.attachment('downtime-logs.csv');
    res.send(csv);
  } catch (err) {
    next(err);
  }
};

export const exportDowntimeLogsXlsxHandler = async (
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
    const logs = await listDowntimeLogs(tenantId, filters);

    const rows = logs
      .map((log) => {
        const start = log.start ? new Date(log.start) : undefined;
        const end = log.end ? new Date(log.end) : undefined;
        const durationMinutes =
          start && end ? Number(((end.getTime() - start.getTime()) / 60000).toFixed(2)) : '';

        return [
          log.assetId?.toString?.() ?? '',
          start?.toISOString() ?? '',
          end?.toISOString() ?? '',
          durationMinutes,
          log.reason ?? '',
        ];
      })
      .map(
        (cells) =>
          `<Row>${cells
            .map((value) => `<Cell><Data ss:Type="String">${escapeXml(String(value))}</Data></Cell>`)
            .join('')}</Row>`,
      )
      .join('');

    const headerRow = ['Asset ID', 'Start', 'End', 'Duration (minutes)', 'Reason']
      .map((label) => `<Cell><Data ss:Type="String">${escapeXml(label)}</Data></Cell>`)
      .join('');

    const xml = `<?xml version="1.0"?>\n<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Downtime Logs"><Table><Row>${headerRow}</Row>${rows}</Table></Worksheet></Workbook>`;
    res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.attachment('downtime-logs.xlsx');
    res.send(xml);
  } catch (err) {
    next(err);
  }
};

export const getDowntimeLogHandler = async (
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

    const log = await getDowntimeLog(tenantId, id);
    if (!log) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    sendResponse(res, log);
  } catch (err) {
    next(err);
  }
};

export const createDowntimeLogHandler = async (
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

    if (!req.body?.assetId || !req.body?.start) {
      sendResponse(res, null, 'assetId and start are required', 400);
      return;
    }

    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const created = await createDowntimeLog(tenantId, req.body);
    if (Types.ObjectId.isValid(tenantId)) {
      await createNotification({
        tenantId: new Types.ObjectId(tenantId),
        assetId: created.assetId as Types.ObjectId | undefined,
        category: 'updated',
        type: 'warning',
        title: 'Downtime logged',
        message: `Downtime recorded${created.assetId ? ' for asset' : ''}.`,
      });
    }
    await writeAuditLog({
      tenantId,
      userId,
      action: 'create',
      entityType: 'DowntimeLog',
      entityId: toEntityId(created._id as Types.ObjectId),
      after: created.toObject(),
    });
    sendResponse(res, created, null, 201);
  } catch (err) {
    next(err);
  }
};

export const updateDowntimeLogHandler = async (
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
    const before = await getDowntimeLog(tenantId, id);
    if (!before) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }

    const updated = await updateDowntimeLog(tenantId, id, req.body);
    await writeAuditLog({
      tenantId,
      userId,
      action: 'update',
      entityType: 'DowntimeLog',
      entityId: toEntityId(new Types.ObjectId(id)),
      before: before,
      after: updated ?? undefined,
    });

    sendResponse(res, updated);
  } catch (err) {
    next(err);
  }
};

export const deleteDowntimeLogHandler = async (
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
    const deleted = await deleteDowntimeLog(tenantId, id);
    if (!deleted) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }

    await writeAuditLog({
      tenantId,
      userId,
      action: 'delete',
      entityType: 'DowntimeLog',
      entityId: toEntityId(new Types.ObjectId(id)),
      before: deleted,
    });

    sendResponse(res, { message: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
};
