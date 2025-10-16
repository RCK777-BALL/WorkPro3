/*
 * SPDX-License-Identifier: MIT
 */

import express from 'express';
import type { RequestHandler } from 'express';
import multer, { MulterError } from 'multer';

import {
  getAllAssets,
  getAssetById,
  createAsset,
  updateAsset,
  deleteAsset,
  searchAssets,
  getAssetTree,
} from '../controllers/AssetController';
import { requireAuth } from '../middleware/authMiddleware';
import siteScope from '../middleware/siteScope';
import { assetValidators } from '../validators/assetValidators';

const router = express.Router();

const allowedMimeTypes = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'application/pdf',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      cb(new Error('INVALID_FILE_TYPE'));
      return;
    }
    cb(null, true);
  },
});

const uploadMiddleware: RequestHandler = (req, res, next) => {
  upload.any()(req, res, (err?: unknown) => {
    if (!err) {
      next();
      return;
    }

    if (err instanceof MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ message: 'File too large' });
        return;
      }
      res.status(400).json({ message: err.message });
      return;
    }

    if (err instanceof Error && err.message === 'INVALID_FILE_TYPE') {
      res.status(400).json({ message: 'Invalid file type' });
      return;
    }

    next(err as Error);
  });
};

router.use(requireAuth);
router.use(siteScope);

router.get('/', getAllAssets);
router.get('/search', searchAssets);
router.get('/tree', getAssetTree);
router.get('/:id', getAssetById);

router.post('/', uploadMiddleware, assetValidators, createAsset);
router.put('/:id', uploadMiddleware, assetValidators, updateAsset);
router.delete('/:id', deleteAsset);

export default router;
