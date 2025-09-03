import { AuthedRequest, AuthedRequestHandler } from '../types/http';
import Asset from '../models/Asset';
import mongoose from 'mongoose';
import { validationResult } from 'express-validator';
import type { Express } from 'express';
import logger from '../utils/logger';

export const getAllAssets: AuthedRequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const filter: any = { tenantId: req.tenantId };
    if (req.siteId) filter.siteId = req.siteId;
    const assets = await Asset.find(filter);
    res.json(assets);
  } catch (err) {
    next(err);
  }
};

export const getAssetById: AuthedRequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const filter: any = { _id: req.params.id, tenantId: req.tenantId };
    if (req.siteId) filter.siteId = req.siteId;
    const asset = await Asset.findOne(filter);
    if (!asset) return res.status(404).json({ message: 'Not found' });
    res.json(asset);
  } catch (err) {
    next(err);
  }
};

export const createAsset: AuthedRequestHandler = async (
  req,
  res,
  next
  ) => {
  logger.debug('createAsset body:', req.body);
  logger.debug('createAsset files:', (req as any).files);
  const files = (req as any).files as Express.Multer.File[] | undefined;
  if (!files || files.length === 0) {
    logger.debug('No files uploaded for asset');
  }

  const { user, tenantId: reqTenantId } = req as AuthedRequest;
  const resolvedTenantId = reqTenantId || user?.tenantId;
  if (!resolvedTenantId) {
    return res.status(400).json({ message: 'Tenant ID is required' });
  }

  if (!req.body.name) {
    return res.status(400).json({ message: 'name is required' });
  }

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const tenantId = resolvedTenantId;

    const payload: any = { ...req.body, tenantId };
    if (req.siteId && !payload.siteId) payload.siteId = req.siteId;
    const newAsset = await Asset.create(payload);
    const assetObj = newAsset.toObject();
    const response = { ...assetObj, tenantId: assetObj.tenantId.toString() };

    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
};

export const updateAsset: AuthedRequestHandler = async (
  req,
  res,
  next
  ) => {
  logger.debug('updateAsset body:', req.body);
  logger.debug('updateAsset files:', (req as any).files);
  const files = (req as any).files as Express.Multer.File[] | undefined;
  if (!files || files.length === 0) {
    logger.debug('No files uploaded for asset update');
  }

  const { user, tenantId: reqTenantId } = req as AuthedRequest;
  const tenantId = reqTenantId || user?.tenantId;
  if (!tenantId) {
    return res.status(400).json({ message: 'Tenant ID is required' });
  }

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const filter: any = { _id: req.params.id, tenantId };
    if (req.siteId) filter.siteId = req.siteId;
    const asset = await Asset.findOneAndUpdate(
      filter,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );
    if (!asset) return res.status(404).json({ message: 'Not found' });
    res.json(asset);
  } catch (err) {
    next(err);
  }
};

export const deleteAsset: AuthedRequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const filter: any = { _id: req.params.id, tenantId: req.tenantId };
    if (req.siteId) filter.siteId = req.siteId;
    const asset = await Asset.findOneAndDelete(filter);
    if (!asset) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
};

export const searchAssets: AuthedRequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const q = (req.query.q as string) || '';
    const regex = new RegExp(q, 'i');
    const filter: any = {
      name: { $regex: regex },
      tenantId: req.tenantId,
    };
    if (req.siteId) filter.siteId = req.siteId;
    const assets = await Asset.find(filter).limit(10);
    res.json(assets);
  } catch (err) {
    next(err);
  }
};
