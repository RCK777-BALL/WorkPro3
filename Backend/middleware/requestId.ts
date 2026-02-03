/*
 * SPDX-License-Identifier: MIT
 */

import type { NextFunction, Request, Response } from 'express';
import crypto from 'crypto';

const HEADER_NAME = 'x-request-id';

const generateId = (): string => {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`;
};

const requestId = (req: Request, res: Response, next: NextFunction): void => {
  const incoming = req.header(HEADER_NAME);
  const id = incoming && incoming.trim() ? incoming.trim() : generateId();

  (req as Request & { requestId?: string }).requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
};

export default requestId;
