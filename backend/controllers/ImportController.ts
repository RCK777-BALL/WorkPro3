/*
 * SPDX-License-Identifier: MIT
 */

import { parse } from 'csv-parse/sync';
import Asset from '../models/Asset';
import Department, { type DepartmentDoc } from '../models/Department';
import InventoryItem from '../models/InventoryItem';
import Line, { type LineDoc } from '../models/Line';
import Station, { type StationDoc } from '../models/Station';
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

interface ImportIssue {
  row: number;
  reason: string;
}

const getStringField = (record: Record<string, unknown>, keys: string[]): string => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) {
        return trimmed;
      }
    }
  }
  return '';
};

const normalizeName = (value: string): string => value.trim().toLowerCase();

const findDepartmentForImport = async (
  tenantId: string,
  siteId: string | undefined,
  name: string,
): Promise<DepartmentDoc | null> => {
  if (siteId) {
    const bySite = await Department.findOne({ tenantId, name, siteId });
    if (bySite) return bySite;
    const byNull = await Department.findOne({ tenantId, name, siteId: null });
    if (byNull) return byNull;
    const withoutSite = await Department.findOne({ tenantId, name, siteId: { $exists: false } });
    if (withoutSite) return withoutSite;
  }
  const any = await Department.findOne({ tenantId, name });
  return any;
};

const findLineForImport = async (
  tenantId: string,
  departmentId: DepartmentDoc['_id'],
  siteId: string | undefined,
  name: string,
): Promise<LineDoc | null> => {
  if (siteId) {
    const bySite = await Line.findOne({ tenantId, departmentId, name, siteId });
    if (bySite) return bySite;
    const byNull = await Line.findOne({ tenantId, departmentId, name, siteId: null });
    if (byNull) return byNull;
    const withoutSite = await Line.findOne({ tenantId, departmentId, name, siteId: { $exists: false } });
    if (withoutSite) return withoutSite;
  }
  const any = await Line.findOne({ tenantId, departmentId, name });
  return any;
};

const findStationForImport = async (
  tenantId: string,
  lineId: LineDoc['_id'],
  departmentId: DepartmentDoc['_id'],
  siteId: string | undefined,
  name: string,
): Promise<StationDoc | null> => {
  if (siteId) {
    const bySite = await Station.findOne({ tenantId, lineId, departmentId, name, siteId });
    if (bySite) return bySite;
    const byNull = await Station.findOne({ tenantId, lineId, departmentId, name, siteId: null });
    if (byNull) return byNull;
    const withoutSite = await Station.findOne({
      tenantId,
      lineId,
      departmentId,
      name,
      siteId: { $exists: false },
    });
    if (withoutSite) return withoutSite;
  }
  const any = await Station.findOne({ tenantId, lineId, departmentId, name });
  return any;
};

export const importDepartments: AuthedRequestHandler = async (req, res, next) => {
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
    }) as Record<string, unknown>[];

    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const siteIdValue = req.siteId ?? undefined;
    const siteId = siteIdValue ? siteIdValue.toString() : undefined;

    const departmentCache = new Map<string, DepartmentDoc>();
    const lineCache = new Map<string, LineDoc>();
    const stationCache = new Map<string, StationDoc>();

    const issues: ImportIssue[] = [];

    let departmentsCreated = 0;
    let departmentsUpdated = 0;
    let linesCreated = 0;
    let linesUpdated = 0;
    let stationsCreated = 0;
    let stationsUpdated = 0;
    let rowsSkipped = 0;

    for (let idx = 0; idx < records.length; idx += 1) {
      const record = records[idx];
      const rowNumber = idx + 1;

      const departmentName = getStringField(record, ['department', 'departmentName', 'Department']);
      if (!departmentName) {
        issues.push({ row: rowNumber, reason: 'Missing department name' });
        rowsSkipped += 1;
        continue;
      }
      const departmentNotes = getStringField(record, ['departmentNotes', 'deptNotes', 'department_note']);

      const departmentKey = normalizeName(departmentName);
      let department = departmentCache.get(departmentKey);
      if (!department) {
        department = await findDepartmentForImport(tenantId, siteId, departmentName);
        if (!department) {
          department = await Department.create({
            name: departmentName,
            notes: departmentNotes ?? '',
            tenantId,
            ...(siteIdValue ? { siteId: siteIdValue } : {}),
          });
          departmentsCreated += 1;
        } else if (departmentNotes && department.notes !== departmentNotes) {
          department.notes = departmentNotes;
          await department.save();
          departmentsUpdated += 1;
        }
        departmentCache.set(departmentKey, department);
      } else if (departmentNotes && department.notes !== departmentNotes) {
        department.notes = departmentNotes;
        await department.save();
        departmentsUpdated += 1;
      }

      const lineName = getStringField(record, ['line', 'lineName', 'Line']);
      const lineNotes = getStringField(record, ['lineNotes', 'line_note']);
      let line: LineDoc | null = null;
      if (lineName) {
        const lineKey = `${department._id.toString()}|${normalizeName(lineName)}`;
        line = lineCache.get(lineKey) ?? null;
        if (!line) {
          const preferredSite = department.siteId?.toString() ?? siteId;
          line = await findLineForImport(tenantId, department._id, preferredSite, lineName);
          if (!line) {
            const lineSiteId = department.siteId ?? siteIdValue;
            line = await Line.create({
              name: lineName,
              notes: lineNotes ?? '',
              departmentId: department._id,
              tenantId,
              ...(lineSiteId ? { siteId: lineSiteId } : {}),
            });
            linesCreated += 1;
            await Department.updateOne(
              { _id: department._id, tenantId },
              {
                $push: {
                  lines: {
                    _id: line._id,
                    name: line.name,
                    notes: line.notes ?? '',
                    tenantId,
                    stations: [],
                  },
                },
              },
            );
          } else if (lineNotes && line.notes !== lineNotes) {
            line.notes = lineNotes;
            await line.save();
            linesUpdated += 1;
            await Department.updateOne(
              { _id: department._id, tenantId, 'lines._id': line._id },
              {
                $set: {
                  'lines.$.notes': line.notes ?? '',
                  'lines.$.name': line.name,
                },
              },
            );
          }
          if (line) {
            lineCache.set(lineKey, line);
          }
        } else if (lineNotes && line.notes !== lineNotes) {
          line.notes = lineNotes;
          await line.save();
          linesUpdated += 1;
          await Department.updateOne(
            { _id: department._id, tenantId, 'lines._id': line._id },
            {
              $set: {
                'lines.$.notes': line.notes ?? '',
                'lines.$.name': line.name,
              },
            },
          );
        }
      }

      const stationName = getStringField(record, ['station', 'stationName', 'Station']);
      const stationNotes = getStringField(record, ['stationNotes', 'station_note']);
      if (stationName) {
        if (!line) {
          issues.push({ row: rowNumber, reason: 'Station provided without a line; station skipped' });
          continue;
        }
        const stationKey = `${line._id.toString()}|${normalizeName(stationName)}`;
        let station = stationCache.get(stationKey) ?? null;
        if (!station) {
          const preferredSite = line.siteId?.toString() ?? department.siteId?.toString() ?? siteId;
          station = await findStationForImport(
            tenantId,
            line._id,
            department._id,
            preferredSite,
            stationName,
          );
          if (!station) {
            const stationSiteId = line.siteId ?? department.siteId ?? siteIdValue;
            station = await Station.create({
              name: stationName,
              notes: stationNotes ?? '',
              lineId: line._id,
              departmentId: department._id,
              tenantId,
              ...(stationSiteId ? { siteId: stationSiteId } : {}),
            });
            stationsCreated += 1;
            await Line.updateOne(
              { _id: line._id },
              { $addToSet: { stations: station._id } },
            );
            await Department.updateOne(
              { _id: department._id, tenantId, 'lines._id': line._id },
              {
                $push: {
                  'lines.$.stations': {
                    _id: station._id,
                    name: station.name,
                    notes: station.notes ?? '',
                    assets: [],
                  },
                },
              },
            );
          } else if (stationNotes && station.notes !== stationNotes) {
            station.notes = stationNotes;
            await station.save();
            stationsUpdated += 1;
            await Department.updateOne(
              { _id: department._id, tenantId },
              {
                $set: {
                  'lines.$[line].stations.$[station].notes': station.notes ?? '',
                  'lines.$[line].stations.$[station].name': station.name,
                },
              },
              {
                arrayFilters: [
                  { 'line._id': line._id },
                  { 'station._id': station._id },
                ],
              },
            );
          }
          if (station) {
            stationCache.set(stationKey, station);
          }
        } else if (stationNotes && station.notes !== stationNotes) {
          station.notes = stationNotes;
          await station.save();
          stationsUpdated += 1;
          await Department.updateOne(
            { _id: department._id, tenantId },
            {
              $set: {
                'lines.$[line].stations.$[station].notes': station.notes ?? '',
                'lines.$[line].stations.$[station].name': station.name,
              },
            },
            {
              arrayFilters: [
                { 'line._id': line._id },
                { 'station._id': station._id },
              ],
            },
          );
        }
      }
    }

    sendResponse(res, {
      rowsProcessed: records.length,
      rowsSkipped,
      departmentsCreated,
      departmentsUpdated,
      linesCreated,
      linesUpdated,
      stationsCreated,
      stationsUpdated,
      issues,
    });
    return;
  } catch (err) {
    next(err);
  }
};

