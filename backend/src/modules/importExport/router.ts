/*
 * SPDX-License-Identifier: MIT
 */

import path from 'path';
import { Router } from 'express';
import multer from 'multer';

import { requireAuth } from '../../../middleware/authMiddleware';
import tenantScope from '../../../middleware/tenantScope';
import { exportAssets, importEntities } from './controller';
import { ImportExportError } from './service';
import { requirePermission } from '../../auth/permissions';
import authorizeTenantSite from '../../middleware/tenantAuthorization';
import { auditDataAccess } from '../audit';

const router = Router();

const memoryStorage = multer.memoryStorage();
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_EXTENSIONS = new Set(['.csv', '.xlsx', '.xls']);

const upload = multer({
  storage: memoryStorage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.has(ext) || /csv|excel|spreadsheet/i.test(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new ImportExportError('Only CSV or Excel files are supported.', 400));
  },
});

router.use(requireAuth);
router.use(tenantScope);
router.use(authorizeTenantSite());
router.use(auditDataAccess('import_export'));

router.get('/assets/export', requirePermission('importExport', 'export'), exportAssets);
router.post(
  '/:entity/import',
  requirePermission('importExport', 'import'),
  upload.single('file'),
  importEntities,
);

export default router;
