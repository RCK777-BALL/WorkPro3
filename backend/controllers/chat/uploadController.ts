/*
 * SPDX-License-Identifier: MIT
 */

import path from 'path';
import fs from 'fs';
import multer from 'multer';
import type { Request, Response } from 'express';
import type { AuthedRequestHandler } from '../../types/http';
import { resolveUserAndTenant } from './utils';
import { sendResponse } from '../../utils/sendResponse';

const uploadDirectory = path.join(process.cwd(), 'uploads', 'chat');

const ensureUploadDirectory = () => {
  if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, { recursive: true });
  }
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureUploadDirectory();
    cb(null, uploadDirectory);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${unique}-${safeName}`);
  },
});

const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024,
    files: 5,
  },
}).array('files', 5);

const runUploadMiddleware = (req: Request, res: Response) =>
  new Promise<void>((resolve, reject) => {
    uploadMiddleware(req, res, (err: unknown) => {
      if (err) {
        reject(err);
        return;
      }

      resolve();
    });
  });

export const handleChatUpload: AuthedRequestHandler = async (req, res, next) => {
  try {
    await runUploadMiddleware(req as Request, res);

    const resolved = resolveUserAndTenant(req, res, { requireTenant: false });
    if (!resolved) return;

    const files = (req.files as Express.Multer.File[]) ?? [];
    const payload = files.map((file) => ({
      name: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      url: `/static/uploads/chat/${file.filename}`,
      tempKey: file.filename,
    }));

    sendResponse(res, payload, null, 201);
  } catch (error) {
    next(error);
  }
};

