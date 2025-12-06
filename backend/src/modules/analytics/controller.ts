/*
 * SPDX-License-Identifier: MIT
 */

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

export const rebuildSnapshotHandler: AuthedRequestHandler = async (req, res, next) => {
  try {
    const months = typeof req.body?.months === 'number' ? req.body.months : undefined;
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
