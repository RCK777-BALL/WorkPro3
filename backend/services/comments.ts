/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';
import Asset from '../models/Asset';
import Comment, { type CommentDocument, type CommentEntityType } from '../models/Comment';
import WorkOrder from '../models/WorkOrder';
import { parseMentions, notifyMentionedUsers } from './mentions';
import { notifyUser } from '../utils';

export interface CommentCreateInput {
  tenantId: Types.ObjectId;
  entityType: CommentEntityType;
  entityId: Types.ObjectId;
  userId: Types.ObjectId;
  content: string;
  threadId: string;
  parentId?: Types.ObjectId | null;
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

export const buildThreadId = (entityType: CommentEntityType, entityId: Types.ObjectId) =>
  `${entityType}:${entityId.toString()}`;

const findParentComment = async (
  parentId: Types.ObjectId,
  tenantId: Types.ObjectId,
  entityType: CommentEntityType,
  entityId: Types.ObjectId,
): Promise<CommentDocument | null> =>
  Comment.findOne({
    _id: parentId,
    tenantId,
    entityType,
    entityId,
  }).populate({ path: 'userId', select: 'name email avatar' });

export const ensureEntityBelongsToTenant = async (
  entityType: CommentEntityType,
  entityId: Types.ObjectId,
  tenantId: Types.ObjectId,
): Promise<void> => {
  const Model = getEntityModel(entityType);
  const exists = await Model.exists({ _id: entityId, tenantId } as any);
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

  const mentions = parseMentions(input.content);

  let parent: CommentDocument | null = null;
  if (input.parentId) {
    parent = await findParentComment(input.parentId, input.tenantId, input.entityType, input.entityId);
    if (!parent) {
      const error = new Error('Parent comment not found for this thread');
      // @ts-expect-error augment
      error.status = 404;
      throw error;
    }
  }

  const threadId = input.threadId || parent?.threadId || buildThreadId(input.entityType, input.entityId);
  const comment = await Comment.create({
    tenantId: input.tenantId,
    entityType: input.entityType,
    entityId: input.entityId,
    userId: input.userId,
    content: input.content,
    parentId: parent?._id ?? null,
    threadId,
    mentions,
  });

  if (input.entityType === 'WO') {
    await WorkOrder.updateOne(
      { _id: input.entityId, tenantId: input.tenantId },
      {
        $push: {
          timeline: {
            label: 'Comment added',
            notes: input.content.slice(0, 240),
            createdAt: new Date(),
            createdBy: input.userId,
            type: 'comment',
          },
        },
      },
    );
  }

  await notifyMentionedUsers(
    {
      tenantId: input.tenantId,
      entityType: input.entityType,
      entityId: input.entityId,
      authorId: input.userId,
      body: input.content,
    },
    mentions,
  );

  if (parent && parent.userId && parent.userId.toString() !== input.userId.toString()) {
    const entityLabel = input.entityType === 'WO' ? 'work order' : 'asset';
    const message = `You have a new reply on ${entityLabel} ${input.entityId.toString()}.`;
    await notifyUser(parent.userId, message, { title: 'New comment reply', category: 'comment' });
  }

  return comment.populate({ path: 'userId', select: 'name email avatar' });
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
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(pageSize)
    .populate({ path: 'userId', select: 'name email avatar' });

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
