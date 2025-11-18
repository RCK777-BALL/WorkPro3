/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { mkdir } from 'fs/promises';
import { requireAuth, requireScopes } from '../middleware/authMiddleware';
import {
  completeOfflineAction,
  enqueueOfflineAction,
  getOfflineQueue,
  recordOfflineActionFailure,
  listMobileWorkOrders,
  lookupAsset,
  uploadMobileAttachment,
} from '../controllers/MobileController';

const router = Router();

const MOBILE_SCOPE = 'mobile:access';

router.use(requireAuth);
router.use(requireScopes(MOBILE_SCOPE));

const uploadsDir = path.join(process.cwd(), 'uploads', 'mobile');

const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    try {
      await mkdir(uploadsDir, { recursive: true });
      cb(null, uploadsDir);
    } catch (error) {
      cb(error as Error, uploadsDir);
    }
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const extension = path.extname(file.originalname);
    cb(null, `${unique}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.get('/v1/work-orders', listMobileWorkOrders);
router.get('/v1/assets', lookupAsset);
router.post('/v1/attachments', upload.single('file'), uploadMobileAttachment);
router.get('/v1/offline-queue', getOfflineQueue);
router.post('/v1/offline-queue', enqueueOfflineAction);
router.post('/v1/offline-queue/:id/fail', recordOfflineActionFailure);
router.post('/v1/offline-queue/:id/complete', completeOfflineAction);

export default router;
