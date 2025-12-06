/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';
import User from '../models/User';
import { notifyUser } from '../utils';

const MENTION_PATTERN = /@\{[^|}]+\|([a-fA-F0-9]{24})\}/g;

export interface MentionContext {
  tenantId: Types.ObjectId;
  entityType: 'WO' | 'Asset';
  entityId: Types.ObjectId;
  authorId: Types.ObjectId;
  body: string;
}

export const parseMentions = (body: string): Types.ObjectId[] => {
  if (!body || typeof body !== 'string') {
    return [];
  }

  const matches = body.matchAll(MENTION_PATTERN);
  const ids: Types.ObjectId[] = [];

  for (const match of matches) {
    const rawId = match[1];
    if (Types.ObjectId.isValid(rawId)) {
      ids.push(new Types.ObjectId(rawId));
    }
  }

  return ids;
};

export const notifyMentionedUsers = async (
  context: MentionContext,
  mentions: Types.ObjectId[],
): Promise<void> => {
  const uniqueMentions = Array.from(
    new Set(
      mentions
        .filter((id) => id && id.toString() !== context.authorId.toString())
        .map((id) => id.toString()),
    ),
  ).map((id) => new Types.ObjectId(id));

  if (!uniqueMentions.length) {
    return;
  }

  const recipients = await User.find({
    _id: { $in: uniqueMentions },
    tenantId: context.tenantId,
  });

  if (!recipients.length) {
    return;
  }

  const entityLabel = context.entityType === 'WO' ? 'work order' : 'asset';
  const message = `You were mentioned in a comment on ${entityLabel} ${context.entityId.toString()}.`;

  await Promise.all(
    recipients.map(async (user) =>
      notifyUser(user._id, message, { title: 'You were mentioned', category: 'comment' }),
    ),
  );
};
