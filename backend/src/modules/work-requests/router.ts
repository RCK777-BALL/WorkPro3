/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { mkdirSync } from 'fs';

import { requireAuth } from '../../../middleware/authMiddleware';
import tenantScope from '../../../middleware/tenantScope';
import validateObjectId from '../../../middleware/validateObjectId';
import {
  submitPublicRequestHandler,
  getPublicStatusHandler,
  listWorkRequestsHandler,
  getWorkRequestHandler,
  getWorkRequestSummaryHandler,
  convertWorkRequestHandler,
} from './controller';

const uploadDir = path.join(process.cwd(), 'uploads', 'work-requests');
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
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
});

const router = Router();

const publicRouter = Router();
publicRouter.post('/', upload.array('photos', 5), submitPublicRequestHandler);
publicRouter.get('/:token', getPublicStatusHandler);

const adminRouter = Router();
adminRouter.use(requireAuth);
adminRouter.use(tenantScope);
adminRouter.get('/', listWorkRequestsHandler);
adminRouter.get('/summary', getWorkRequestSummaryHandler);
adminRouter.get('/:requestId', validateObjectId('requestId'), getWorkRequestHandler);
adminRouter.post(
  '/:requestId/convert',
  validateObjectId('requestId'),
  convertWorkRequestHandler,
);

router.use('/public/work-requests', publicRouter);
router.use('/work-requests', adminRouter);

export default router;
