import Asset from '../models/Asset';
import { validationResult } from 'express-validator';
import type { Request, Express } from 'express';
import logger from '../utils/logger';
import { Request, Response, NextFunction } from 'express';

const tenantSiteFilter = (req: Request, base: any = {}) => {
  const filter: any = { ...base, tenantId: req.tenantId };
  if (req.siteId) filter.siteId = req.siteId;
  return filter;
};

export const getAllAssets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const assets = await Asset.find(tenantSiteFilter(req));
    return res.json(assets);
  } catch (err) {
    next(err);
    return;
  }
};

export const getAssetById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const asset = await Asset.findOne(tenantSiteFilter(req, { _id: req.params.id }));
    if (!asset) {
      return res.status(404).json({ message: 'Not found' });
    }
    return res.json(asset);
  } catch (err) {
    next(err);
    return;
  }
};

export const createAsset = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  logger.debug('createAsset body:', req.body);
  logger.debug('createAsset files:', (req as any).files);

  const files = (req as any).files as Express.Multer.File[] | undefined;
  if (!files || files.length === 0) {
    logger.debug('No files uploaded for asset');
  }

  const { user, tenantId: reqTenantId } = req as Request;
  const resolvedTenantId = reqTenantId || user?.tenantId;
  if (!resolvedTenantId) {
    return res.status(400).json({ message: 'Tenant ID is required' });
  }

  if (!req.body.name) {
    return res.status(400).json({ message: 'name is required' });
  }

  try {
    const errors = validationResult(req as Request);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const payload: any = { ...req.body, tenantId: resolvedTenantId };
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

export const updateAsset = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  logger.debug('updateAsset body:', req.body);
  logger.debug('updateAsset files:', (req as any).files);

  const files = (req as any).files as Express.Multer.File[] | undefined;
  if (!files || files.length === 0) {
    logger.debug('No files uploaded for asset update');
  }

  const { user, tenantId: reqTenantId } = req as Request;
  const tenantId = reqTenantId || user?.tenantId;
  if (!tenantId) {
    return res.status(400).json({ message: 'Tenant ID is required' });
  }

  try {
    const errors = validationResult(req as Request);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const asset = await Asset.findOneAndUpdate(
      tenantSiteFilter(req, { _id: req.params.id, tenantId }),
      req.body,
      { new: true, runValidators: true }
    );

    if (!asset) {
      return res.status(404).json({ message: 'Not found' });
    }
    return res.json(asset);
  } catch (err) {
    next(err);
    return;
  }
};

export const deleteAsset = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const asset = await Asset.findOneAndDelete(tenantSiteFilter(req, { _id: req.params.id }));
    if (!asset) {
      return res.status(404).json({ message: 'Not found' });
    }
    return res.json({ message: 'Deleted successfully' });
  } catch (err) {
    next(err);
    return;
  }
};

export const searchAssets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const q = (req.query.q as string) || '';
    const regex = new RegExp(q, 'i');

    const assets = await Asset.find(
      tenantSiteFilter(req, { name: { $regex: regex } })
    ).limit(10);

    return res.json(assets);
  } catch (err) {
    next(err);
    return;
  }
};
