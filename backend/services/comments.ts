/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';
import Asset from '../models/Asset';
import Comment, { type CommentDocument, type CommentEntityType } from '../models/Comment';
import WorkOrder from '../models/WorkOrder';
import { parseMentions, notifyMentionedUsers } from './mentions';

export interface CommentCreateInput {
  tenantId: Types.ObjectId;
  entityType: CommentEntityType;
  entityId: Types.ObjectId;
  authorId: Types.ObjectId;
  body: string;
}

export interface CommentListInput {
  tenantId: Types.ObjectId;
  entityType: CommentEntityType;
  entityId: Types.ObjectId;
  page?: number;
  pageSize?: number;
}

const getEntityModel = (entityType: CommentEntityType) =>
  entityType === 'WO' ? WorkOrder : Asset;

export const ensureEntityBelongsToTenant = async (
  entityType: CommentEntityType,
  entityId: Types.ObjectId,
  tenantId: Types.ObjectId,
): Promise<void> => {
  const Model = getEntityModel(entityType);
  const exists = await Model.exists({ _id: entityId, tenantId });
  if (!exists) {
    const error = new Error('Entity not found or inaccessible');
    // @ts-expect-error augment
    error.status = 404;
    throw error;
  }
};

export const createComment = async (
  input: CommentCreateInput,
): Promise<CommentDocument> => {
  await ensureEntityBelongsToTenant(input.entityType, input.entityId, input.tenantId);

  const mentions = parseMentions(input.body);
  const comment = await Comment.create({
    tenantId: input.tenantId,
    entityType: input.entityType,
    entityId: input.entityId,
    authorId: input.authorId,
    body: input.body,
    mentions,
  });

  await notifyMentionedUsers(
    {
      tenantId: input.tenantId,
      entityType: input.entityType,
      entityId: input.entityId,
      authorId: input.authorId,
      body: input.body,
    },
    mentions,
  );

  return comment.populate({ path: 'authorId', select: 'name email avatar' });
};

export const listComments = async (
  input: CommentListInput,
): Promise<{ items: CommentDocument[]; total: number; page: number; pageSize: number }> => {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 10));
  const skip = (page - 1) * pageSize;

  await ensureEntityBelongsToTenant(input.entityType, input.entityId, input.tenantId);

  const query = Comment.find({
    tenantId: input.tenantId,
    entityType: input.entityType,
    entityId: input.entityId,
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageSize)
    .populate({ path: 'authorId', select: 'name email avatar' });

  const [items, total] = await Promise.all([
    query.exec(),
    Comment.countDocuments({
      tenantId: input.tenantId,
      entityType: input.entityType,
      entityId: input.entityId,
    }),
  ]);

  return { items, total, page, pageSize };
};
