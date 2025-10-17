/*
 * SPDX-License-Identifier: MIT
 */

import express, { type RequestHandler } from 'express';
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
import tenantScope from '../middleware/tenantScope';
import validateObjectId from '../middleware/validateObjectId';
import { validate } from '../middleware/validationMiddleware';
import { assetUpdateValidators, assetValidators } from '../validators/assetValidators';

const router = express.Router();

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('Invalid file type'));
  },
});

const handleUploads: RequestHandler = (req, res, next) => {
  if (!req.is('multipart/form-data')) {
    next();
    return;
  }

  upload.any()(req, res, (err) => {
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

    res.status(400).json({ message: err instanceof Error ? err.message : 'Invalid file upload' });
  });
};

router.use(requireAuth);
router.use(tenantScope);

router.get('/', getAllAssets);
router.get('/search', searchAssets);
router.get('/tree', getAssetTree);
router.get('/:id', validateObjectId('id'), getAssetById);

router.post('/', handleUploads, assetValidators, validate, createAsset);
router.put(
  '/:id',
  validateObjectId('id'),
  handleUploads,
  assetUpdateValidators,
  validate,
  updateAsset,
);
router.delete('/:id', validateObjectId('id'), deleteAsset);

export default router;
