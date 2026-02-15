/*
 * SPDX-License-Identifier: MIT
 */

import type { FilterQuery } from 'mongoose';
import { Types } from 'mongoose';
import { z } from 'zod';
import type { AuthedRequest, AuthedRequestHandler } from '../types/http';
import WorkOrder, { type WorkOrder as WorkOrderEntity } from '../models/WorkOrder';
import Asset, { type AssetDoc } from '../models/Asset';
import MobileOfflineAction, { type MobileOfflineAction as MobileOfflineActionDoc } from '../models/MobileOfflineAction';
import type { MobileScanOutcome } from '../models/MobileScanHistory';
import {
  computeBackoffSeconds,
  ensureMatchHeader,
  handleConditionalListRequest,
  computeListEtag,
  setEntityVersionHeaders,
} from '../services/mobileSyncService';
import { emitTelemetry } from '../services/telemetryService';
import { upsertDeviceTelemetry, type DeviceTelemetryInput } from '../services/mobileSyncAdminService';
import { listScanHistory, recordScanHistory } from '../services/mobileScanHistoryService';
import { writeAuditLog, type AuditActor } from '../utils';
import type { MobileOfflineActionStatus } from '../models/MobileOfflineAction';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const parseNumber = (value: unknown, fallback: number): number => {
  const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const sanitizeSearch = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const getDeviceContext = (req: AuthedRequest) => ({
  deviceId: sanitizeSearch(req.headers['x-device-id']),
  platform: sanitizeSearch(req.headers['x-device-platform']),
  appVersion: sanitizeSearch(req.headers['x-app-version']),
});

const toAuditActor = (user?: AuthedRequest['user']): AuditActor | undefined => {
  if (!user) return undefined;
  const actor: AuditActor = {};
  const id: unknown = user._id ?? user.id;
  if (typeof id === 'string' || (typeof id === 'object' && id instanceof Types.ObjectId)) {
    actor.id = id;
  }
  const name = typeof (user as any).name === 'string' ? (user as any).name.trim() : undefined;
  if (name) actor.name = name;
  const email = typeof (user as any).email === 'string' ? (user as any).email.trim() : undefined;
  if (email) actor.email = email;
  return actor.id || actor.name || actor.email ? actor : undefined;
};

const serializeWorkOrder = (workOrder: any) => ({
  id: workOrder._id?.toString(),
  title: workOrder.title,
  status: workOrder.status,
  priority: workOrder.priority,
  type: workOrder.type,
  assetId: workOrder.assetId?.toString(),
  assignedTo: workOrder.assignedTo?.toString(),
  updatedAt: workOrder.updatedAt,
  dueDate: workOrder.dueDate,
  lineId: workOrder.line?.toString?.() ?? workOrder.line,
  stationId: workOrder.station?.toString?.() ?? workOrder.station,
  version: workOrder.version,
  etag: workOrder.etag,
  lastSyncedAt: workOrder.lastSyncedAt,
});

const serializeAsset = (asset: any) => ({
  id: asset._id?.toString(),
  name: asset.name,
  serialNumber: asset.serialNumber,
  type: asset.type,
  status: asset.status,
  line: asset.line,
  station: asset.station,
  location: asset.location,
});

const serializeOfflineAction = (action: any) => ({
  id: action._id?.toString(),
  type: action.type,
  payload: action.payload ?? {},
  status: action.status,
  version: action.version,
  etag: action.etag,
  lastSyncedAt: action.lastSyncedAt,
  attempts: action.attempts,
  maxAttempts: action.maxAttempts,
  nextAttemptAt: action.nextAttemptAt,
  backoffSeconds: action.backoffSeconds,
  lastError: action.lastError,
  processedAt: action.processedAt,
  createdAt: action.createdAt,
});

const serializeOfflineActionStatus = (action: any) => ({
  id: action._id?.toString(),
  status: action.status as MobileOfflineActionStatus,
  attempts: action.attempts,
  maxAttempts: action.maxAttempts,
  nextAttemptAt: action.nextAttemptAt,
  backoffSeconds: action.backoffSeconds,
  lastError: action.lastError,
  lastSyncedAt: action.lastSyncedAt,
});

const offlineActionSchema = z.object({
  type: z.string().trim().min(1),
  payload: z.record(z.any()).optional().default({}),
});

const offlineActionFailureSchema = z.object({
  message: z.string().trim().min(1).optional(),
  retryable: z.boolean().optional().default(true),
});

const SCAN_OUTCOMES = ['resolved', 'missing', 'invalid', 'error'] as const satisfies readonly MobileScanOutcome[];

const decodedEntitySchema = z.object({
  type: z.string().trim().optional(),
  id: z.string().trim().optional(),
  label: z.string().trim().optional(),
});

const scanRecordSchema = z.object({
  rawValue: z.string().trim().min(1),
  decodedEntity: decodedEntitySchema.optional(),
  navigationTarget: z.string().trim().optional(),
  outcome: z.enum(SCAN_OUTCOMES),
  errorMessage: z.string().trim().optional(),
});

const serializeScanHistory = (scan: any) => ({
  id: scan._id?.toString?.() ?? scan._id,
  rawValue: scan.rawValue,
  decodedType: scan.decodedType ?? null,
  decodedId: scan.decodedId ?? null,
  decodedLabel: scan.decodedLabel ?? null,
  navigationTarget: scan.navigationTarget ?? null,
  outcome: scan.outcome,
  errorMessage: scan.errorMessage ?? null,
  exportState: scan.exportState ?? null,
  createdAt: scan.createdAt ?? scan.updatedAt ?? undefined,
});

export const listMobileWorkOrders: AuthedRequestHandler = async (req, res) => {
  const tenantId = req.tenantId;
  if (!tenantId) {
    res.status(400).json({ message: 'Tenant context is required' });
    return;
  }

  const page = parseNumber(req.query.page, DEFAULT_PAGE);
  const limit = Math.min(parseNumber(req.query.limit, DEFAULT_LIMIT), MAX_LIMIT);
  const search = sanitizeSearch(req.query.search);
  const status = sanitizeSearch(req.query.status);
  const assigned = sanitizeSearch(req.query.assigned);

  const filter: FilterQuery<WorkOrderEntity> = { tenantId };
  if (status) {
    filter.status = status as any;
  }

  if (assigned === 'me' && req.user?._id) {
    filter.$or = [{ assignedTo: req.user._id }, { assignees: req.user._id }];
  }

  if (search) {
    filter.title = { $regex: search, $options: 'i' };
  }

  const [items, total] = await Promise.all([
    WorkOrder.find(filter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('title status priority type updatedAt dueDate assetId assignedTo line station version etag lastSyncedAt')
      .lean(),
    WorkOrder.countDocuments(filter),
  ]);

  const etag = computeListEtag(items);
  if (handleConditionalListRequest(req, res, etag)) {
    return;
  }

  res.json({
    data: {
      items: items.map(serializeWorkOrder),
      pagination: {
        page,
        limit,
        total,
      },
    },
  });
};

export const lookupAsset: AuthedRequestHandler = async (req, res) => {
  const tenantId = req.tenantId;
  if (!tenantId) {
    res.status(400).json({ message: 'Tenant context is required' });
    return;
  }

  const search = sanitizeSearch(req.query.q ?? req.query.search);
  if (!search) {
    res.status(400).json({ message: 'Search query is required' });
    return;
  }

  const limit = Math.min(parseNumber(req.query.limit, 10), 50);

  const filter: FilterQuery<AssetDoc> = {
    tenantId,
    $or: [
      { name: { $regex: search, $options: 'i' } },
      { serialNumber: { $regex: search, $options: 'i' } },
    ],
  };

  const assets = await Asset.find(filter)
    .limit(limit)
    .sort({ updatedAt: -1 })
    .select('name serialNumber type status line station location')
    .lean();

  res.json({ data: assets.map(serializeAsset) });
};

export const uploadMobileAttachment: AuthedRequestHandler = async (req, res) => {
  const file = (req as typeof req & { file?: Express.Multer.File }).file;
  if (!file) {
    res.status(400).json({ message: 'File is required' });
    return;
  }

  const publicPath = `/static/uploads/mobile/${file.filename}`;
  res.status(201).json({
    data: {
      id: file.filename,
      url: publicPath,
      mimeType: file.mimetype,
      size: file.size,
      originalName: file.originalname,
    },
  });
};

export const recordMobileScan: AuthedRequestHandler = async (req, res) => {
  const tenantId = req.tenantId;
  const userId = req.user?._id ?? req.user?.id;

  if (!tenantId || !userId) {
    res.status(400).json({ message: 'Tenant and user are required' });
    return;
  }

  const parsed = scanRecordSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() });
    return;
  }

  const actor = toAuditActor(req.user);

  const record = await recordScanHistory({
    tenantId: new Types.ObjectId(tenantId),
    userId: new Types.ObjectId(String(userId)),
    rawValue: parsed.data.rawValue,
    decodedEntity: parsed.data.decodedEntity,
    navigationTarget: parsed.data.navigationTarget ?? null,
    outcome: parsed.data.outcome,
    errorMessage: parsed.data.errorMessage ?? null,
    ...(actor ? { actor } : {}),
  });

  res.status(201).json({ data: serializeScanHistory(record) });
};

export const listRecentMobileScans: AuthedRequestHandler = async (req, res) => {
  const tenantId = req.tenantId;
  const userId = req.user?._id ?? req.user?.id;

  if (!tenantId || !userId) {
    res.status(400).json({ message: 'Tenant and user are required' });
    return;
  }

  const page = parseNumber(req.query.page, DEFAULT_PAGE);
  const limit = Math.min(parseNumber(req.query.limit, DEFAULT_LIMIT), MAX_LIMIT);

  const result = await listScanHistory({
    tenantId: new Types.ObjectId(tenantId),
    userId: new Types.ObjectId(String(userId)),
    page,
    limit,
  });

  res.json({
    data: {
      items: result.items.map(serializeScanHistory),
      pagination: result.pagination,
    },
  });
};

export const getOfflineQueue: AuthedRequestHandler = async (req, res) => {
  const tenantId = req.tenantId;
  const userId = req.user?._id ?? req.user?.id;
  if (!tenantId || !userId) {
    res.status(400).json({ message: 'Tenant and user are required' });
    return;
  }

  const limit = Math.min(parseNumber(req.query.limit, DEFAULT_LIMIT), MAX_LIMIT);
  const status = sanitizeSearch(req.query.status) ?? 'pending';

  const now = new Date();
  const query: FilterQuery<MobileOfflineActionDoc> = {
    tenantId,
    userId,
    status,
  };

  if (status === 'pending') {
    query.$or = [{ nextAttemptAt: { $exists: false } }, { nextAttemptAt: { $lte: now } }];
  }

  const actions = await MobileOfflineAction.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  const etag = computeListEtag(actions);
  if (handleConditionalListRequest(req, res, etag)) {
    return;
  }

  res.json({ data: actions.map(serializeOfflineAction) });
};

export const enqueueOfflineAction: AuthedRequestHandler = async (req, res) => {
  const tenantId = req.tenantId;
  const userId = req.user?._id ?? req.user?.id;
  if (!tenantId || !userId) {
    res.status(400).json({ message: 'Tenant and user are required' });
    return;
  }

  const parsed = offlineActionSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() });
    return;
  }

  const action = await MobileOfflineAction.create({
    tenantId,
    userId,
    type: parsed.data.type.trim(),
    entityType: parsed.data.type.trim(),
    operation: parsed.data.type.trim(),
    payload: parsed.data.payload,
    nextAttemptAt: new Date(),
    status: 'pending',
  });

  const device = getDeviceContext(req);
  if (device.deviceId) {
    const telemetry: DeviceTelemetryInput = {
      tenantId: new Types.ObjectId(tenantId),
      userId: new Types.ObjectId(userId),
      deviceId: device.deviceId,
      pendingDelta: 1,
    };

    if (device.platform) telemetry.platform = device.platform;
    if (device.appVersion) telemetry.appVersion = device.appVersion;

    await upsertDeviceTelemetry(telemetry);
  }

  emitTelemetry('mobile.offlineAction.created', {
    tenantId: tenantId.toString(),
    userId: userId.toString(),
    actionId: action._id.toString(),
    type: action.type,
  });

  const actor = toAuditActor(req.user);

  await writeAuditLog({
    tenantId,
    userId,
    ...(actor ? { actor } : {}),
    action: 'mobile.offlineAction.created',
    entityType: 'MobileOfflineAction',
    entityId: action._id,
    after: action.toObject(),
  });

  setEntityVersionHeaders(res, action);
  res.status(201).json({ data: serializeOfflineAction(action) });
};

export const completeOfflineAction: AuthedRequestHandler = async (req, res) => {
  const tenantId = req.tenantId;
  const userId = req.user?._id ?? req.user?.id;
  const actionId = sanitizeSearch(req.params?.id);

  if (!tenantId || !userId) {
    res.status(400).json({ message: 'Tenant and user are required' });
    return;
  }

  if (!actionId || !Types.ObjectId.isValid(actionId)) {
    res.status(400).json({ message: 'A valid action id is required' });
    return;
  }

  const existing = await MobileOfflineAction.findOne({ _id: actionId, tenantId, userId });

  if (!existing) {
    res.status(404).json({ message: 'Offline action not found' });
    return;
  }

  try {
    ensureMatchHeader(req, existing.etag);
  } catch (error) {
    res.status((error as any).status ?? 412).json({ message: 'Precondition Failed' });
    return;
  }

  const before = existing.toObject();
  existing.status = 'synced';
  existing.processedAt = new Date();
  existing.lastSyncedAt = new Date();
  await existing.save();

  const device = getDeviceContext(req);
  if (device.deviceId) {
    const telemetry: DeviceTelemetryInput = {
      tenantId: new Types.ObjectId(tenantId),
      userId: new Types.ObjectId(userId),
      deviceId: device.deviceId,
      pendingDelta: -1,
    };

    if (device.platform) telemetry.platform = device.platform;
    if (device.appVersion) telemetry.appVersion = device.appVersion;

    await upsertDeviceTelemetry(telemetry);
  }

  emitTelemetry('mobile.offlineAction.completed', {
    tenantId: tenantId.toString(),
    userId: userId.toString(),
    actionId: existing._id.toString(),
    type: existing.type,
    attempts: existing.attempts ?? 0,
  });

  const actor = toAuditActor(req.user);

  await writeAuditLog({
    tenantId,
    userId,
    ...(actor ? { actor } : {}),
    action: 'mobile.offlineAction.completed',
    entityType: 'MobileOfflineAction',
    entityId: existing._id,
    before,
    after: existing.toObject(),
  });

  setEntityVersionHeaders(res, existing);
  res.json({ data: serializeOfflineAction(existing) });
};

export const recordOfflineActionFailure: AuthedRequestHandler = async (req, res) => {
  const tenantId = req.tenantId;
  const userId = req.user?._id ?? req.user?.id;
  const actionId = sanitizeSearch(req.params?.id);

  if (!tenantId || !userId) {
    res.status(400).json({ message: 'Tenant and user are required' });
    return;
  }

  if (!actionId || !Types.ObjectId.isValid(actionId)) {
    res.status(400).json({ message: 'A valid action id is required' });
    return;
  }

  const parsed = offlineActionFailureSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() });
    return;
  }

  const existing = await MobileOfflineAction.findOne({ _id: actionId, tenantId, userId });
  if (!existing) {
    res.status(404).json({ message: 'Offline action not found' });
    return;
  }

  try {
    ensureMatchHeader(req, existing.etag);
  } catch (error) {
    res.status((error as any).status ?? 412).json({ message: 'Precondition Failed' });
    return;
  }

  const before = existing.toObject();

  const attempts = (existing.attempts ?? 0) + 1;
  existing.attempts = attempts;
  existing.set('lastError', parsed.data.message ?? undefined);

  const shouldRetry = parsed.data.retryable !== false && attempts < (existing.maxAttempts ?? 5);
  if (shouldRetry) {
    const backoffSeconds = computeBackoffSeconds(attempts);
    existing.backoffSeconds = backoffSeconds;
    existing.nextAttemptAt = new Date(Date.now() + backoffSeconds * 1000);
    existing.status = 'retrying';
  } else {
    existing.status = 'failed';
    existing.set('nextAttemptAt', undefined);
    existing.set('backoffSeconds', undefined);
  }

  await existing.save();

  const device = getDeviceContext(req);
  if (device.deviceId) {
    const telemetry: DeviceTelemetryInput = {
      tenantId: new Types.ObjectId(tenantId),
      userId: new Types.ObjectId(userId),
      deviceId: device.deviceId,
      failedDelta: existing.status === 'failed' ? 1 : 0,
    };

    if (device.platform) telemetry.platform = device.platform;
    if (device.appVersion) telemetry.appVersion = device.appVersion;
    if (parsed.data.message) telemetry.lastFailureReason = parsed.data.message;

    await upsertDeviceTelemetry(telemetry);
  }

  emitTelemetry('mobile.offlineAction.failed', {
    tenantId: tenantId.toString(),
    userId: userId.toString(),
    actionId: existing._id.toString(),
    attempts: existing.attempts,
    backoffSeconds: existing.backoffSeconds,
    status: existing.status,
  });

  const actor = toAuditActor(req.user);

  await writeAuditLog({
    tenantId,
    userId,
    ...(actor ? { actor } : {}),
    action: 'mobile.offlineAction.failed',
    entityType: 'MobileOfflineAction',
    entityId: existing._id,
    before,
    after: existing.toObject(),
  });

  setEntityVersionHeaders(res, existing);
  res.json({ data: serializeOfflineAction(existing) });
};

export const getOfflineActionStatus: AuthedRequestHandler = async (req, res) => {
  const tenantId = req.tenantId;
  const userId = req.user?._id ?? req.user?.id;
  const actionId = sanitizeSearch(req.params?.id);

  if (!tenantId || !userId) {
    res.status(400).json({ message: 'Tenant and user are required' });
    return;
  }

  if (!actionId || !Types.ObjectId.isValid(actionId)) {
    res.status(400).json({ message: 'A valid action id is required' });
    return;
  }

  const action = await MobileOfflineAction.findOne({ _id: actionId, tenantId, userId }).lean();

  if (!action) {
    res.status(404).json({ message: 'Offline action not found' });
    return;
  }

  setEntityVersionHeaders(res, action);
  res.json({ data: serializeOfflineActionStatus(action) });
};

