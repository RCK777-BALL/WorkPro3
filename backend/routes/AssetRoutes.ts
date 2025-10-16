/*
 * SPDX-License-Identifier: MIT
 */

import express, { type RequestHandler } from 'express';
import multer from 'multer';
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
import requireRoles from '../middleware/requireRoles';
import { validate } from '../middleware/validationMiddleware';
import { assetValidators } from '../validators/assetValidators';
import siteScope from '../middleware/siteScope';
import validateObjectId from '../middleware/validateObjectId';

const router = express.Router();

const storage = multer.memoryStorage();
const allowedMimeTypes = ['image/png', 'image/jpeg', 'application/pdf'];

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb: multer.FileFilterCallback) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

// If you know your fields, prefer:
// const uploadFields = upload.fields([{ name: 'files', maxCount: 5 }]);
// and use `uploadFields` instead of `upload.any()`
const handleUpload: RequestHandler = (req, res, next) => {
  upload.any()(req, res, (err: unknown) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      // Multer-specific errors (e.g., LIMIT_FILE_SIZE)
      return res.status(400).json({ message: err.message, code: err.code });
    }
    if (err instanceof Error) {
      return res.status(400).json({ message: err.message });
    }
    return res.status(400).json({ message: 'Upload error' });
  });
};

router.use(requireAuth);
router.use(siteScope);

router.get('/', getAllAssets);
router.get('/search', searchAssets);
router.get('/tree', getAssetTree);
 router.get('/:id', validateObjectId('id'), getAssetById);
 
router.post(
  '/',
  requireRoles(['admin', 'supervisor']),
  handleUpload,
  assetValidators,
  validate,
  createAsset
);

router.put(
  '/:id',
  validateObjectId('id'),
  requireRoles(['admin', 'supervisor']),
  handleUpload,
  assetValidators,
  validate,
  updateAsset
);
router.delete('/:id', validateObjectId('id'), requireRoles(['admin', 'supervisor']), deleteAsset);
 

export default router;
