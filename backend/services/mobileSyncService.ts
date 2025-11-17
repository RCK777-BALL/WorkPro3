/*
 * SPDX-License-Identifier: MIT
 */

import type { Request, Response } from 'express';
import { computeCollectionEtag, normalizeEtag } from '../utils/versioning';

export const setEntityVersionHeaders = (
  res: Response,
  entity: { etag?: string; version?: number },
): void => {
  if (entity.etag) {
    res.setHeader('ETag', entity.etag);
  }
  if (typeof entity.version === 'number') {
    res.setHeader('X-Resource-Version', String(entity.version));
  }
};

export const handleConditionalListRequest = (
  req: Request,
  res: Response,
  etag: string,
): boolean => {
  const requested = normalizeEtag(req.headers['if-none-match']);
  res.setHeader('ETag', etag);
  if (requested && requested === etag) {
    res.status(304).end();
    return true;
  }
  return false;
};

export const ensureMatchHeader = (req: Request, currentEtag?: string): void => {
  if (!currentEtag) return;
  const provided = normalizeEtag(req.headers['if-match']);
  if (provided && provided !== currentEtag) {
    const error = new Error('Precondition Failed');
    (error as any).status = 412;
    throw error;
  }
};

export const computeListEtag = (
  items: Array<{ _id?: string; version?: number; updatedAt?: Date; etag?: string }>,
): string => computeCollectionEtag(items);
