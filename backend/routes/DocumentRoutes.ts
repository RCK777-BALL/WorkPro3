/*
 * SPDX-License-Identifier: MIT
 */

import express, { type RequestHandler } from 'express';
import {
  getAllDocuments,
  getDocumentById,
  createDocument,
  updateDocument,
  deleteDocument
} from '../controllers/DocumentController';
import { requireAuth } from '../middleware/authMiddleware';
import { validate } from '../middleware/validationMiddleware';
import validateObjectId from '../middleware/validateObjectId';
import { documentValidators } from '../validators/documentValidators';

const router = express.Router();
const documentValidationHandlers = documentValidators as unknown as RequestHandler[];

router.use(requireAuth);
router.get('/', getAllDocuments);
router.get('/:id', validateObjectId('id'), getDocumentById);
router.post('/', ...documentValidationHandlers, validate, createDocument);
router.put('/:id', validateObjectId('id'), ...documentValidationHandlers, validate, updateDocument);
router.delete('/:id', validateObjectId('id'), deleteDocument);

export default router;
