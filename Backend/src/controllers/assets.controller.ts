/*
 * SPDX-License-Identifier: MIT
 */

import type { Response } from 'express';
import type { AuthedRequest, AuthedRequestHandler } from '../../types/http';
import {
  listAssets,
  getAssetById,
  createAsset,
  updateAsset,
  deleteAsset,
} from '../services/assets.service';
import type { AssetCreateInput, AssetQueryInput, AssetUpdateInput } from '../../../shared/validators/asset';

const ensureTenant = (req: AuthedRequest, res: Response): req is AuthedRequest & { tenantId: string } => {
  if (!req.tenantId) {
    res.status(401).json({ message: 'Missing tenant scope' });
    return false;
  }
  return true;
};

export const listAssetsHandler: AuthedRequestHandler = async (req, res, next) => {
  try {
    if (!ensureTenant(req, res)) return;
    const data = await listAssets(req.tenantId, req.query as unknown as AssetQueryInput);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const getAssetHandler: AuthedRequestHandler<{ assetId: string }> = async (req, res, next) => {
  try {
    if (!ensureTenant(req, res)) return;
    const asset = await getAssetById(req.tenantId, req.params.assetId);
    if (!asset) {
      res.status(404).json({ message: 'Asset not found' });
      return;
    }
    res.json(asset);
  } catch (error) {
    next(error);
  }
};

export const createAssetHandler: AuthedRequestHandler = async (req, res, next) => {
  try {
    if (!ensureTenant(req, res)) return;
    const asset = await createAsset(req.tenantId, req.body as AssetCreateInput);
    res.status(201).json(asset);
  } catch (error) {
    next(error);
  }
};

export const updateAssetHandler: AuthedRequestHandler<{ assetId: string }> = async (req, res, next) => {
  try {
    if (!ensureTenant(req, res)) return;
    const asset = await updateAsset(req.tenantId, req.params.assetId, req.body as AssetUpdateInput);
    if (!asset) {
      res.status(404).json({ message: 'Asset not found' });
      return;
    }
    res.json(asset);
  } catch (error) {
    next(error);
  }
};

export const deleteAssetHandler: AuthedRequestHandler<{ assetId: string }> = async (req, res, next) => {
  try {
    if (!ensureTenant(req, res)) return;
    await deleteAsset(req.tenantId, req.params.assetId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
