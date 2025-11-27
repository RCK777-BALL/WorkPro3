/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';
import { createComment, listComments } from '../services/comments';
import type { AuthedRequestHandler } from '../types/http';
import { sendResponse } from '../utils/sendResponse';
import { toObjectId, toEntityId } from '../utils/ids';

const parsePagination = (value: unknown) => {
  const first = Array.isArray(value) ? value[0] : value;
  const numeric = Number(first);
  return Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : undefined;
};

const mapComment = (comment: any) => ({
  id: toEntityId(comment._id) ?? '',
  body: comment.body,
  mentions: Array.isArray(comment.mentions)
    ? comment.mentions.map((m: Types.ObjectId | string) => m.toString())
    : [],
  author: comment.authorId
    ? {
        id: toEntityId(comment.authorId._id) ?? '',
        name: comment.authorId.name,
        email: comment.authorId.email,
        avatar: comment.authorId.avatar,
      }
    : undefined,
  createdAt:
    comment.createdAt instanceof Date
      ? comment.createdAt.toISOString()
      : (comment.createdAt ?? new Date()).toString(),
  updatedAt:
    comment.updatedAt instanceof Date
      ? comment.updatedAt.toISOString()
      : comment.updatedAt,
});

const buildListHandler = (entityType: 'WO' | 'Asset'): AuthedRequestHandler<{ id: string }> =>
  async (req, res, next) => {
    try {
      const tenantId = toObjectId(req.tenantId ?? req.user?.tenantId);
      const entityId = toObjectId(req.params.id);
      if (!tenantId || !entityId) {
        res.status(400).json({ message: 'Invalid tenant or entity identifier' });
        return;
      }

      const page = parsePagination(req.query.page);
      const limit = parsePagination(req.query.limit);

      const result = await listComments({
        tenantId,
        entityType,
        entityId,
        ...(page !== undefined ? { page } : {}),
        ...(limit !== undefined ? { pageSize: limit } : {}),
      });

      sendResponse(res, {
        items: result.items.map(mapComment),
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
      });
    } catch (err) {
      next(err);
    }
  };

const buildCreateHandler = (
  entityType: 'WO' | 'Asset',
): AuthedRequestHandler<{ id: string }, unknown, { body?: string }> =>
  async (req, res, next) => {
    try {
      const tenantId = toObjectId(req.tenantId ?? req.user?.tenantId);
      const entityId = toObjectId(req.params.id);
      const authorId = toObjectId(req.user?._id ?? req.user?.id);
      if (!tenantId || !entityId || !authorId) {
        res.status(400).json({ message: 'Invalid tenant or user context' });
        return;
      }

      const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
      if (!body) {
        res.status(400).json({ message: 'Comment body is required' });
        return;
      }

      const comment = await createComment({
        tenantId,
        entityType,
        entityId,
        authorId,
        body,
      });

      sendResponse(res, mapComment(comment));
    } catch (err) {
      next(err);
    }
  };

export const listWorkOrderComments = buildListHandler('WO');
export const createWorkOrderComment = buildCreateHandler('WO');
export const listAssetComments = buildListHandler('Asset');
export const createAssetComment = buildCreateHandler('Asset');
