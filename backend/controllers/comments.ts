/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';
import { createComment, listComments, buildThreadId } from '../services/comments';
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
  threadId: comment.threadId,
  parentId: comment.parentId ? toEntityId(comment.parentId) ?? undefined : undefined,
  content: comment.content,
  mentions: Array.isArray(comment.mentions)
    ? comment.mentions.map((m: Types.ObjectId | string) => m.toString())
    : [],
  user: comment.userId
    ? {
        id: toEntityId(comment.userId._id) ?? '',
        name: comment.userId.name,
        email: comment.userId.email,
        avatar: comment.userId.avatar,
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
): AuthedRequestHandler<{ id: string }, unknown, { body?: string; content?: string; parentId?: string }> =>
  async (req, res, next) => {
    try {
      const tenantId = toObjectId(req.tenantId ?? req.user?.tenantId);
      const entityId = toObjectId(req.params.id);
      const userId = toObjectId(req.user?._id ?? req.user?.id);
      if (!tenantId || !entityId || !userId) {
        res.status(400).json({ message: 'Invalid tenant or user context' });
        return;
      }

      const contentRaw = typeof req.body?.content === 'string' ? req.body.content : req.body?.body;
      const content = typeof contentRaw === 'string' ? contentRaw.trim() : '';
      if (!content) {
        res.status(400).json({ message: 'Comment body is required' });
        return;
      }

      const parentId = req.body?.parentId ? toObjectId(req.body.parentId) : null;
      if (req.body?.parentId && !parentId) {
        res.status(400).json({ message: 'Invalid parent comment identifier' });
        return;
      }

      const comment = await createComment({
        tenantId,
        entityType,
        entityId,
        userId,
        content,
        threadId: buildThreadId(entityType, entityId),
        parentId: parentId ?? undefined,
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
