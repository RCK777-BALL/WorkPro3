/*
 * SPDX-License-Identifier: MIT
 */

import express from 'express';
import { body, validationResult } from 'express-validator';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { requireAuth } from '../middleware/authMiddleware';
import { sendResponse } from '../utils/sendResponse';
import type { AttachmentInput, Attachment } from '../../shared/types/uploads';
import type { AuthedRequestHandler } from '../types/http';

const router = express.Router();

const validators = [
  body('kind').isIn(['base64', 'url']),
  body('filename').optional().isString(),
  body('contentType').optional().isString(),
  body('data').if(body('kind').equals('base64')).isString().notEmpty(),
  body('filename').if(body('kind').equals('base64')).isString().notEmpty(),
  body('url')
    .if(body('kind').equals('url'))
    .isString()
    .custom((val) => {
      try {
        // eslint-disable-next-line no-new
        new URL(val);
        return true;
      } catch {
        return false;
      }
    }),
];

router.use(requireAuth);

const createAttachment: AuthedRequestHandler<
  Record<string, string>,
  { data: Attachment | null; error: unknown },
  AttachmentInput
> = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    sendResponse(res, null, errors.array(), 400);
    return;
  }

  const tenantId = req.tenantId;
  if (!tenantId) {
    sendResponse(res, null, 'Tenant ID required', 400);
    return;
  }

  const input = req.body;
  let result: Attachment;

  const uploadRoot = path.join(process.cwd(), 'uploads');
  if (input.kind === 'base64') {
    const uuid = randomUUID();
    const dir = path.join(uploadRoot, tenantId.toString());
    await fs.mkdir(dir, { recursive: true });
    const buffer = Buffer.from(input.data, 'base64');
    const storedName = `${uuid}-${input.filename}`;
    await fs.writeFile(path.join(dir, storedName), buffer);
    result = {
      url: `/static/uploads/${tenantId}/${storedName}`,
      filename: input.filename,
      contentType: input.contentType,
    };
  } else {
    let contentType = input.contentType;
    if (!contentType) {
      try {
        const head = await fetch(input.url, { method: 'HEAD' });
        contentType = head.headers.get('content-type') ?? undefined;
      } catch {
        // ignore network errors
      }
    }
    const filename = input.filename || path.basename(new URL(input.url).pathname) || 'file';
    result = { url: input.url, filename, contentType };
  }

  sendResponse(res, result, null, 201);
};

router.post('/', validators, createAttachment);

export default router;

