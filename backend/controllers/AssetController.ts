import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Asset from '../models/Asset';
import { validationResult } from 'express-validator';
import logger from '../utils/logger';
import { filterFields } from '../utils/filterFields';

const assetCreateFields = [
  'name',
  'type',
  'location',
  'departmentId',
  'status',
  'serialNumber',
  'description',
  'modelName',
  'manufacturer',
  'purchaseDate',
  'installationDate',
  'lineId',
  'stationId',
  'siteId',
  'criticality',
  'documents',
];

const assetUpdateFields = [...assetCreateFields];

export const getAllAssets = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const filter: any = { tenantId: req.tenantId };
    if (req.siteId) filter.siteId = req.siteId;

    const assets = await Asset.find(filter);
    return res.json(assets);
  } catch (err) {
    next(err);
    return;
  }
};

export const getAssetById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid ID' });
    }
    const filter: any = { _id: req.params.id, tenantId: req.tenantId };
    if (req.siteId) filter.siteId = req.siteId;

    const asset = await Asset.findOne(filter);
    if (!asset) {
      return res.status(404).json({ message: 'Not found' });
    }
    return res.json(asset);
  } catch (err) {
    next(err);
    return;
  }
};

export const createAsset = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  logger.debug('createAsset body:', req.body);
  logger.debug('createAsset files:', (req as any).files);

  const files = (req as any).files as
    | Array<{ originalname?: string; mimetype?: string; size?: number }>
    | undefined;
  if (!files || files.length === 0) {
    logger.debug('No files uploaded for asset');
  }

  const { user, tenantId: reqTenantId } = req;
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
      return res.status(400).json({ errors: errors.array() });
    }

    const tenantId = resolvedTenantId;

    const payload: any = filterFields(req.body, assetCreateFields);
    payload.tenantId = tenantId;
    if (req.siteId && !payload.siteId) payload.siteId = req.siteId;

    const newAsset = await Asset.create(payload);
    const assetObj = newAsset.toObject();
    const response = { ...assetObj, tenantId: assetObj.tenantId.toString() };

    return res.status(201).json(response);
  } catch (err) {
    next(err);
    return;
  }
};

export const updateAsset = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  logger.debug('updateAsset body:', req.body);
  logger.debug('updateAsset files:', (req as any).files);

  const files = (req as any).files as
    | Array<{ originalname?: string; mimetype?: string; size?: number }>
    | undefined;
  if (!files || files.length === 0) {
    logger.debug('No files uploaded for asset update');
  }

  const { user, tenantId: reqTenantId } = req;
  const tenantId = reqTenantId || user?.tenantId;
  if (!tenantId) {
    return res.status(400).json({ message: 'Tenant ID is required' });
  }

  try {
     if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid ID' });
    }
    const errors = validationResult(req);
 
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const filter: any = { _id: req.params.id, tenantId };
    if (req.siteId) filter.siteId = req.siteId;
     const update = filterFields(req.body, assetUpdateFields);
    const asset = await Asset.findOneAndUpdate(filter, update, {
      new: true,
      runValidators: true,
    });
    if (!asset) return res.status(404).json({ message: 'Not found' });
    res.json(asset);
 
  } catch (err) {
    next(err);
    return;
  }
};

export const deleteAsset = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid ID' });
    }
    const filter: any = { _id: req.params.id, tenantId: req.tenantId };
    if (req.siteId) filter.siteId = req.siteId;

    const asset = await Asset.findOneAndDelete(filter);
    if (!asset) {
      return res.status(404).json({ message: 'Not found' });
    }
    return res.json({ message: 'Deleted successfully' });
  } catch (err) {
    next(err);
    return;
  }
};

export const searchAssets = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const q = (req.query.q as string) || '';
    const regex = new RegExp(q, 'i');

    const filter: any = { name: { $regex: regex }, tenantId: req.tenantId };
    if (req.siteId) filter.siteId = req.siteId;

    const assets = await Asset.find(filter).limit(10);
    return res.json(assets);
  } catch (err) {
    next(err);
    return;
  }
};
