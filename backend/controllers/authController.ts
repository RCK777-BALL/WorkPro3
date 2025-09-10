import type { AuthedRequestHandler } from '../types/http';
import Asset from '../models/Asset';
import mongoose from 'mongoose';

// GET /assets
export const getAllAssets: AuthedRequestHandler = async (req, res, next) => {
  try {
    const filter: any = { tenantId: req.tenantId };
    if (req.siteId) filter.siteId = req.siteId;
    const assets = await Asset.find(filter);
    return res.json(assets);
  } catch (err) {
    return next(err);
  }
};

// GET /assets/:id
export const getAssetById: AuthedRequestHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid ID' });
    }
    const filter: any = { _id: id, tenantId: req.tenantId };
    if (req.siteId) filter.siteId = req.siteId;

    const asset = await Asset.findOne(filter);
    if (!asset) return res.status(404).json({ message: 'Not found' });
    return res.json(asset);
  } catch (err) {
    return next(err);
  }
};
