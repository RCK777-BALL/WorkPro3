/*
 * SPDX-License-Identifier: MIT
 */

import express from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/authMiddleware';
import siteScope from '../middleware/siteScope';
import {
  importAssets,
  importDepartments,
  importParts,
} from '../controllers/ImportController';

const router = express.Router();
const upload = multer();

router.use(requireAuth);
router.use(siteScope);

router.post('/assets', upload.single('file'), importAssets);
router.post('/parts', upload.single('file'), importParts);
router.post('/departments', upload.single('file'), importDepartments);

export default router;
