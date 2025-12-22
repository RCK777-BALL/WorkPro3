/*
 * SPDX-License-Identifier: MIT
 */

import { Parser as Json2csvParser } from 'json2csv';
import sendResponse from '../../../utils/sendResponse';
import type { AuthedRequestHandler } from '../../../types/http';
import {
  buildAnalyticsSnapshots,
  getLeaderboards,
  getSiteComparisons,
  getSnapshotsFromWarehouse,
  rebuildWarehouseForTenant,
} from './service';

const parseDate = (value: unknown): Date | undefined => {
  if (typeof value !== 'string') return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const parseGranularity = (value: unknown) =>
  value === 'day' || value === 'month' ? value : undefined;

const parseScope = (value: unknown) =>
  value === 'site' || value === 'asset' || value === 'technician' || value === 'overall'
    ? value
    : undefined;

const snapshotExportFields = [
  { label: 'Period', value: 'period' },
  { label: 'Granularity', value: 'granularity' },
  { label: 'Site', value: 'site' },
  { label: 'Asset', value: 'asset' },
  { label: 'Technician', value: 'technician' },
  { label: 'MTBF (hours)', value: 'mtbfHours' },
  { label: 'MTTR (hours)', value: 'mttrHours' },
  { label: 'Response SLA (%)', value: 'responseSlaRate' },
  { label: 'Resolution SLA (%)', value: 'resolutionSlaRate' },
  { label: 'Utilization (%)', value: 'technicianUtilization' },
  { label: 'Downtime (hours)', value: 'downtimeHours' },
  { label: 'Maintenance Cost', value: 'maintenanceCost' },
];

export const getSnapshotHandler: AuthedRequestHandler = async (req, res, next) => {
  try {
    const from = parseDate(req.query.from);
    const to = parseDate(req.query.to);
    const granularity = parseGranularity(req.query.granularity);
    const scope = parseScope(req.query.scope);
    const snapshots = await getSnapshotsFromWarehouse(req.tenantId!, { from, to, granularity, scope });
    sendResponse(res, { snapshots, generatedAt: new Date() });
  } catch (err) {
    next(err);
  }
};

export const exportSnapshotCsvHandler: AuthedRequestHandler = async (req, res, next) => {
  try {
    const from = parseDate(req.query.from);
    const to = parseDate(req.query.to);
    const granularity = parseGranularity(req.query.granularity);
    const scope = parseScope(req.query.scope);
    const snapshots = await getSnapshotsFromWarehouse(req.tenantId!, { from, to, granularity, scope });

    const rows = snapshots.map((snapshot) => ({
      period: snapshot.period,
      granularity: snapshot.granularity,
      site: snapshot.siteName ?? snapshot.siteId ?? '',
      asset: snapshot.assetName ?? snapshot.assetId ?? '',
      technician: snapshot.technicianName ?? snapshot.technicianId ?? '',
      mtbfHours: snapshot.mtbfHours,
      mttrHours: snapshot.mttrHours,
      responseSlaRate: snapshot.responseSlaRate,
      resolutionSlaRate: snapshot.resolutionSlaRate,
      technicianUtilization: snapshot.technicianUtilization,
      downtimeHours: snapshot.downtimeHours,
      maintenanceCost: snapshot.maintenanceCost,
    }));

    const parser = new Json2csvParser({ fields: snapshotExportFields });
    const csv = parser.parse(rows);
    res.header('Content-Type', 'text/csv');
    res.attachment('analytics-snapshots.csv');
    res.send(csv);
  } catch (err) {
    next(err);
  }
};

export const rebuildSnapshotHandler: AuthedRequestHandler = async (req, res, next) => {
  try {
    const monthsValue = (req.body as { months?: unknown })?.months;
    const months = typeof monthsValue === 'number' ? monthsValue : undefined;
    const snapshots = await rebuildWarehouseForTenant(req.tenantId!, months ?? 6);
    sendResponse(res, { snapshots, rebuilt: true });
  } catch (err) {
    next(err);
  }
};

export const getLeaderboardHandler: AuthedRequestHandler = async (req, res, next) => {
  try {
    const from = parseDate(req.query.from);
    const to = parseDate(req.query.to);
    const granularity = parseGranularity(req.query.granularity);
    const data = await getLeaderboards(req.tenantId!, { from, to, granularity });
    sendResponse(res, data);
  } catch (err) {
    next(err);
  }
};

export const getComparisonHandler: AuthedRequestHandler = async (req, res, next) => {
  try {
    const from = parseDate(req.query.from);
    const to = parseDate(req.query.to);
    const granularity = parseGranularity(req.query.granularity);
    const data = await getSiteComparisons(req.tenantId!, { from, to, granularity });
    sendResponse(res, data);
  } catch (err) {
    next(err);
  }
};

export const previewOnDemandHandler: AuthedRequestHandler = async (req, res, next) => {
  try {
    const from = parseDate(req.query.from);
    const to = parseDate(req.query.to);
    const granularity = parseGranularity(req.query.granularity);
    const scope = parseScope(req.query.scope);
    const snapshots = await buildAnalyticsSnapshots(req.tenantId!, { from, to, granularity, scope });
    sendResponse(res, { snapshots, generatedAt: new Date(), preview: true });
  } catch (err) {
    next(err);
  }
};
