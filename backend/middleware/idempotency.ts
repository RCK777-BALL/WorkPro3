/*
 * SPDX-License-Identifier: MIT
 */

import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import IdempotencyKey from '../models/IdempotencyKey';
import logger from '../utils/logger';

// In-memory fallback for non-Mongo paths
const processed = new Map<string, string>();

const hashRequest = (req: Request): string =>
  crypto
    .createHash('sha256')
    .update(`${req.method}|${req.originalUrl}|${JSON.stringify(req.body || {})}`)
    .digest('hex');

const resolveTenantKey = (req: Request): string => {
  const header = req.header('x-tenant-id');
  if (header && header.trim()) return header.trim();
  const scoped = (req as Request & { tenantId?: string }).tenantId;
  return scoped ?? 'global';
};

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

  const requestHash = hashRequest(req);
  const tenantId = resolveTenantKey(req);
  const ttlMs = parseInt(process.env.IDEMPOTENCY_TTL_MS ?? '86400000', 10);
  const expiresAt = new Date(Date.now() + ttlMs);

  const useMongo = mongoose.connection.readyState === 1;
  if (!useMongo) {
    const existing = processed.get(key);
    if (existing) {
      res.status(409).json({ message: existing === requestHash ? 'Duplicate request' : 'Idempotency key conflict' });
      return;
    }
    processed.set(key, requestHash);
    next();
    return;
  }

  const interceptResponse = () => {
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);
    let captured = false;

    const capture = (body: unknown) => {
      if (captured) return;
      captured = true;
      void IdempotencyKey.updateOne(
        { key, tenantId },
        { $set: { statusCode: res.statusCode ?? 200, responseBody: body } },
      ).catch((err) => logger.warn('Failed to persist idempotency response', err));
    };

    res.json = (body: any) => {
      capture(body);
      return originalJson(body);
    };

    res.send = (body: any) => {
      capture(body);
      return originalSend(body);
    };
  };

  void (async () => {
    try {
      const existing = await IdempotencyKey.findOne({ key, tenantId }).lean();
      if (existing) {
        if (existing.requestHash !== requestHash) {
          res.status(409).json({ message: 'Idempotency key conflict' });
          return;
        }
        if (existing.statusCode && existing.responseBody !== undefined) {
          res.status(existing.statusCode).json(existing.responseBody);
          return;
        }
        res.status(409).json({ message: 'Duplicate request' });
        return;
      }

      await IdempotencyKey.create({
        key,
        tenantId,
        requestHash,
        method: req.method,
        path: req.originalUrl,
        expiresAt,
      });

      interceptResponse();
      next();
    } catch (err: any) {
      if (err?.code === 11000) {
        const existing = await IdempotencyKey.findOne({ key, tenantId }).lean();
        if (existing?.requestHash !== requestHash) {
          res.status(409).json({ message: 'Idempotency key conflict' });
          return;
        }
        if (existing?.statusCode && existing.responseBody !== undefined) {
          res.status(existing.statusCode).json(existing.responseBody);
          return;
        }
        res.status(409).json({ message: 'Duplicate request' });
        return;
      }
      logger.warn('Idempotency middleware failed, falling back to in-memory cache', err);
      const existing = processed.get(key);
      if (existing) {
        res.status(409).json({ message: existing === requestHash ? 'Duplicate request' : 'Idempotency key conflict' });
        return;
      }
      processed.set(key, requestHash);
      next();
    }
  })();
}
