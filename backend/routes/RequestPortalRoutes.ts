/*
 * SPDX-License-Identifier: MIT
 */

import express, { type Request, type Response, type NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import RequestForm from '../models/RequestForm';

const router = express.Router();

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

router.post('/:slug', submissionLimiter, async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { captcha } = req.body;
    if (!(await verifyCaptcha(captcha))) {
      res.status(400).json({ message: 'Invalid CAPTCHA' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
