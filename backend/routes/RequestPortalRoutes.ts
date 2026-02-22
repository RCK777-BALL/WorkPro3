/*
 * SPDX-License-Identifier: MIT
 */

import express, { type Request, type Response, type NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import path from 'path';
import { mkdirSync } from 'fs';

import RequestForm from '../models/RequestForm';
import { getPublicRequestStatus, submitPublicRequest } from '../src/modules/work-requests/service';
import { WorkRequestError } from '../src/modules/work-requests/errors';
import { publicWorkRequestSchema } from '../src/modules/work-requests/schemas';

const router = express.Router();

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

const submissionLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

async function verifyCaptcha(token: string): Promise<boolean> {
  // Placeholder verification for tests
  return token === 'valid-captcha';
}

router.get('/status/:token', async (req: Request, res: Response, next: NextFunction) => {
  const raw = req.params.token;
  const token = Array.isArray(raw) ? raw[0].trim() : raw.trim();

  if (!token) {
    res.status(400).json({ success: false, error: 'A request token is required.' });
    return;
  }
  try {
    const data = await getPublicRequestStatus(token);
    res.json({ success: true, data });
  } catch (err) {
    if (err instanceof WorkRequestError) {
      res.status(err.status).json({ success: false, error: err.message });
      return;
    }
    next(err);
  }
});

router.get('/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const form = await RequestForm.findOne({ slug: req.params.slug }).lean();
    if (!form) {
      res.status(404).json({ message: 'Form not found' });
      return;
    }
    res.json(form.schema);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/:slug',
  submissionLimiter,
  upload.array('photos', 5),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { captcha } = req.body ?? {};
      if (!(await verifyCaptcha(captcha))) {
        res.status(400).json({ message: 'Invalid CAPTCHA' });
        return;
      }

      const parseInput = {
        ...req.body,
        priority: typeof req.body?.priority === 'string' ? req.body.priority.toLowerCase() : undefined,
        formSlug: req.params.slug ?? '',
      };
      const parse = publicWorkRequestSchema.safeParse(parseInput);
      if (!parse.success) {
        res
          .status(400)
          .json({ message: parse.error.errors.map((issue) => issue.message).join(', ') });
        return;
      }

      const files = Array.isArray(req.files) ? (req.files as Express.Multer.File[]) : [];
      const result = await submitPublicRequest(parse.data, files);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      if (err instanceof WorkRequestError) {
        res.status(err.status).json({ message: err.message });
        return;
      }
      next(err);
    }
  },
);

export default router;
