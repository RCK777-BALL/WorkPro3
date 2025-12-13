/*
 * SPDX-License-Identifier: MIT
 */

import http from '@/lib/http';
import type { Comment } from '@/types';

export interface PaginatedComments {
  items: Comment[];
  total: number;
  page: number;
  pageSize: number;
}

const pathFor = (entityType: 'WO' | 'Asset', entityId: string) =>
  entityType === 'WO'
    ? `/comments/work-orders/${entityId}`
    : `/comments/assets/${entityId}`;

export const fetchComments = async (
  entityType: 'WO' | 'Asset',
  entityId: string,
  page = 1,
  pageSize = 10,
): Promise<PaginatedComments> => {
  const res = await http.get<PaginatedComments>(pathFor(entityType, entityId), {
    params: { page, limit: pageSize },
  });
  return res.data;
};

export const createComment = async (
  entityType: 'WO' | 'Asset',
  entityId: string,
  content: string,
  parentId?: string,
): Promise<Comment> => {
  const res = await http.post<Comment>(pathFor(entityType, entityId), { content, parentId });
  return res.data;
};
