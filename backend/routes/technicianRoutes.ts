/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { mkdirSync } from 'fs';

import { requireAuth } from '../middleware/authMiddleware';
import tenantScope from '../middleware/tenantScope';
import validateObjectId from '../middleware/validateObjectId';
import {
  listTechnicianWorkOrders,
  updateTechnicianWorkOrderState,
  recordTechnicianPartUsage,
  uploadTechnicianAttachments,
} from '../controllers/TechnicianController';

const router = Router();

const uploadDir = path.join(process.cwd(), 'uploads', 'technician');
mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${timestamp}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
});

router.use(requireAuth);
router.use(tenantScope);

router.get('/work-orders', listTechnicianWorkOrders);
router.post('/work-orders/:id/state', validateObjectId('id'), updateTechnicianWorkOrderState);
router.post('/work-orders/:id/parts', validateObjectId('id'), recordTechnicianPartUsage);
router.post(
  '/work-orders/:id/attachments',
  validateObjectId('id'),
  upload.array('files', 5),
  uploadTechnicianAttachments,
);

export default router;
