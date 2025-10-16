/*
 * SPDX-License-Identifier: MIT
 */

import express from 'express';
import multer from 'multer';
import type { RequestHandler } from 'express';

import {
  getAllAssets,
  getAssetById,
  createAsset,
  updateAsset,
  deleteAsset,
  searchAssets,
} from '../controllers/AssetController';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import siteScope from '../middleware/siteScope';
import validateObjectId from '../middleware/validateObjectId';
import { validate } from '../middleware/validationMiddleware';
import type { UserRole } from '../types/auth';
import {
  assetValidators,
  assetUpdateValidators,
} from '../validators/assetValidators';

const router = express.Router();

const WRITE_ROLES: UserRole[] = ['admin', 'supervisor', 'planner', 'tech', 'manager'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = new Set([
      'image/png',
      'image/jpeg',
      'image/jpg',
      'application/pdf',
    ]);
    if (allowedTypes.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('Invalid file type'));
  },
});

const handleAssetUpload: RequestHandler = (req, res, next) => {
  if (!req.is('multipart/form-data')) {
    next();
    return;
  }

  upload.any()(req, res, (err) => {
    if (!err) {
      next();
      return;
    }

    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ message: 'File too large' });
      return;
    }

    res.status(400).json({ message: err.message || 'Invalid file upload' });
  });
};

const summary = [
  {
    id: 'AS-1001',
    name: 'Main Air Compressor',
    location: 'Plant 1',
    category: 'Utilities',
    status: 'Open',
  },
  {
    id: 'AS-1042',
    name: 'Packaging Line B',
    location: 'Plant 1',
    category: 'Production',
    status: 'In Progress',
  },
  {
    id: 'AS-1103',
    name: 'Warehouse Forklift 3',
    location: 'Distribution',
    category: 'Material Handling',
    status: 'Completed',
  },
];

router.use(requireAuth);
router.use(siteScope);

router.get('/summary', (_req, res) => {
  res.json({ success: true, data: summary, message: 'Asset summary' });
});

router.get('/search', searchAssets);
router.get('/', getAllAssets);
router.get('/:id', validateObjectId('id'), getAssetById);

router.post(
  '/',
  requireRole(...WRITE_ROLES),
  handleAssetUpload,
  assetValidators,
  validate,
  createAsset,
);

router.put(
  '/:id',
  validateObjectId('id'),
  requireRole(...WRITE_ROLES),
  handleAssetUpload,
  assetUpdateValidators,
  validate,
  updateAsset,
);

router.delete(
  '/:id',
  validateObjectId('id'),
  requireRole(...WRITE_ROLES),
  deleteAsset,
);

export default router;
