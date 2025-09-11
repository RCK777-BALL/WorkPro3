/*
 * SPDX-License-Identifier: MIT
 */

import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// In-memory store for processed idempotency keys and their request hashes
const processed = new Map<string, string>();

export default function idempotency(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const key = req.get('Idempotency-Key');
  if (!key) {
    next();
    return;
  }

  const bodyHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(req.body || {}))
    .digest('hex');

  const existing = processed.get(key);
  if (existing) {
    if (existing === bodyHash) {
      res.status(409).json({ message: 'Duplicate request' });
    } else {
      res.status(409).json({ message: 'Idempotency key conflict' });
    }
    return;
  }

  processed.set(key, bodyHash);
  next();
}
