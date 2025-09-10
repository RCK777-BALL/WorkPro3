import express from 'express';
import multer from 'multer';
import {
  getAllAssets,
  getAssetById,
  createAsset,
  updateAsset,
  deleteAsset,
  searchAssets,
} from '../controllers/AssetController';
import { requireAuth } from '../middleware/authMiddleware';
import requireRole from '../middleware/requireRole';
import { validate } from '../middleware/validationMiddleware';
import { assetValidators } from '../validators/assetValidators';
import siteScope from '../middleware/siteScope';
import validateObjectId from '../middleware/validateObjectId';

const router = express.Router();

const storage = multer.memoryStorage();
const allowedMimeTypes = ['image/png', 'image/jpeg', 'application/pdf'];
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

const handleUpload: express.RequestHandler = (req, res, next) => {
  upload.any()(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};

router.use(requireAuth);
router.use(siteScope);
router.get('/', getAllAssets);
router.get('/search', searchAssets);
router.get('/:id', validateObjectId('id'), getAssetById);
router.post(
  '/',
  requireRole('admin', 'manager'),
  handleUpload,
  assetValidators,
  validate,
  createAsset
);
router.put(
  '/:id',
  validateObjectId('id'),
  requireRole('admin', 'manager'),
  handleUpload,
  assetValidators,
  validate,
  updateAsset
);
router.delete('/:id', validateObjectId('id'), requireRole('admin', 'manager'), deleteAsset);

export default router;
