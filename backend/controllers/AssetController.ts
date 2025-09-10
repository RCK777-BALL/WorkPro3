import type { NextFunction, Response } from 'express';
import type { AuthedRequest, AuthedRequestHandler } from '../types/http';
import mongoose from 'mongoose';
import Asset from '../models/Asset';
import { validationResult } from 'express-validator';
import logger from '../utils/logger';
import { filterFields } from '../utils/filterFields';
import type { AuthedRequestHandler } from '../types/http';

const assetCreateFields = [
  'name', 'type', 'location', 'departmentId', 'status', 'serialNumber',
  'description', 'modelName', 'manufacturer', 'purchaseDate', 'installationDate',
  'lineId', 'stationId', 'siteId', 'criticality', 'documents',
];

const assetUpdateFields = [...assetCreateFields];

export const getAllAssets: AuthedRequestHandler = async (req, res, next) => {
  try {
    const filter: any = { tenantId: req.tenantId };
    if (req.siteId) filter.siteId = req.siteId;
    const assets = await Asset.find(filter);
    res.json(assets);
    return;
  } catch (err) {
    return next(err);
  }
};

export const getAssetById: AuthedRequestHandler = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ message: 'Invalid ID' });
      return;
    }
    const filter: any = { _id: req.params.id, tenantId: req.tenantId };
    if (req.siteId) filter.siteId = req.siteId;

    const asset = await Asset.findOne(filter);
    if (!asset) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    res.json(asset);
    return;
  } catch (err) {
    return next(err);
  }
};

export const createAsset: AuthedRequestHandler = async (req, res, next) => {
 
  logger.debug('createAsset body:', req.body);
  logger.debug('createAsset files:', (req as any).files);

  const files = (req as any).files as
    | Array<{ originalname?: string; mimetype?: string; size?: number }>
    | undefined;
  if (!files || files.length === 0) {
    logger.debug('No files uploaded for asset');
  }

  const { user, tenantId: reqTenantId } = req as any;
 
  const resolvedTenantId = reqTenantId || user?.tenantId;
  if (!resolvedTenantId) {
    return res.status(400).json({ message: 'Tenant ID is required' });
  }

  if (!req.body.name) {
    return res.status(400).json({ message: 'name is required' });
  }

  try {
    const errors = validationResult(req as any);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const tenantId = resolvedTenantId;

    const payload: any = filterFields(req.body, assetCreateFields);
    payload.tenantId = resolvedTenantId;
    if (req.siteId && !payload.siteId) payload.siteId = req.siteId;

    const newAsset = await Asset.create(payload);
    const assetObj = newAsset.toObject();
    const response = { ...assetObj, tenantId: assetObj.tenantId.toString() };

    res.status(201).json(response);
    return;
  } catch (err) {
    return next(err);
  }
};

export const updateAsset: AuthedRequestHandler = async (req, res, next) => {
 
  logger.debug('updateAsset body:', req.body);
  logger.debug('updateAsset files:', (req as any).files);

  const files = (req as any).files as
    | Array<{ originalname?: string; mimetype?: string; size?: number }>
    | undefined;
  if (!files || files.length === 0) {
    logger.debug('No files uploaded for asset update');
  }

  const { user, tenantId: reqTenantId } = req as any;
 
  const tenantId = reqTenantId || user?.tenantId;
  if (!tenantId) {
    return res.status(400).json({ message: 'Tenant ID is required' });
  }

  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid ID' });
    }
    const errors = validationResult(req as any);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const filter: any = { _id: req.params.id, tenantId };
    if (req.siteId) filter.siteId = req.siteId;
    const update = filterFields(req.body, assetUpdateFields);
    const asset = await Asset.findOneAndUpdate(filter, update, {
      new: true,
      runValidators: true,
    });
    if (!asset) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    res.json(asset);
    return;

  } catch (err) {
    return next(err);
  }
};

export const deleteAsset: AuthedRequestHandler = async (req, res, next) => {
 
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid ID' });
    }
    const filter: any = { _id: req.params.id, tenantId: req.tenantId };
    if (req.siteId) filter.siteId = req.siteId;

    const asset = await Asset.findOneAndDelete(filter);
    if (!asset) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    res.json({ message: 'Deleted successfully' });
    return;
  } catch (err) {
    return next(err);
  }
};

export const searchAssets: AuthedRequestHandler = async (req, res, next) => {
  try {
    const q = (req.query.q as string) || '';
    const regex = new RegExp(q, 'i');

    const filter: any = { name: { $regex: regex }, tenantId: req.tenantId };
    if (req.siteId) filter.siteId = req.siteId;

    const assets = await Asset.find(filter).limit(10);
    res.json(assets);
    return;
  } catch (err) {
    return next(err);
  }
};
