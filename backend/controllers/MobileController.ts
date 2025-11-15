/*
 * SPDX-License-Identifier: MIT
 */

import type { FilterQuery } from 'mongoose';
import { Types } from 'mongoose';
import type { AuthedRequestHandler } from '../types/http';
import WorkOrder, { type WorkOrder as WorkOrderEntity } from '../models/WorkOrder';
import Asset, { type AssetDoc } from '../models/Asset';
import MobileOfflineAction from '../models/MobileOfflineAction';

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
  processedAt: action.processedAt,
  createdAt: action.createdAt,
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
      .select('title status priority type updatedAt dueDate assetId assignedTo line station')
      .lean(),
    WorkOrder.countDocuments(filter),
  ]);

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

export const getOfflineQueue: AuthedRequestHandler = async (req, res) => {
  const tenantId = req.tenantId;
  const userId = req.user?._id ?? req.user?.id;
  if (!tenantId || !userId) {
    res.status(400).json({ message: 'Tenant and user are required' });
    return;
  }

  const limit = Math.min(parseNumber(req.query.limit, DEFAULT_LIMIT), MAX_LIMIT);
  const status = sanitizeSearch(req.query.status) ?? 'pending';

  const actions = await MobileOfflineAction.find({
    tenantId,
    userId,
    status,
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  res.json({ data: actions.map(serializeOfflineAction) });
};

export const enqueueOfflineAction: AuthedRequestHandler = async (req, res) => {
  const tenantId = req.tenantId;
  const userId = req.user?._id ?? req.user?.id;
  if (!tenantId || !userId) {
    res.status(400).json({ message: 'Tenant and user are required' });
    return;
  }

  const { type, payload } = (req.body ?? {}) as {
    type?: unknown;
    payload?: Record<string, unknown>;
  };

  if (typeof type !== 'string' || !type.trim()) {
    res.status(400).json({ message: 'Action type is required' });
    return;
  }

  const action = await MobileOfflineAction.create({
    tenantId,
    userId,
    type: type.trim(),
    payload: payload ?? {},
  });

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

  const updated = await MobileOfflineAction.findOneAndUpdate(
    { _id: actionId, tenantId, userId },
    { status: 'processed', processedAt: new Date() },
    { new: true },
  ).lean();

  if (!updated) {
    res.status(404).json({ message: 'Offline action not found' });
    return;
  }

  res.json({ data: serializeOfflineAction(updated) });
};
