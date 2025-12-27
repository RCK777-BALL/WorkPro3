/*
 * SPDX-License-Identifier: MIT
 */

import http from '@/lib/http';
import type { PaginatedResult } from '@/types';

export type WorkRequestStatus =
  | 'new'
  | 'reviewing'
  | 'accepted'
  | 'rejected'
  | 'converted'
  | 'closed'
  | 'deleted';

export type WorkRequestDecisionStatus = 'accepted' | 'rejected';

export interface WorkRequestAttachment {
  key: string;
  files: string[];
  paths: string[];
}

export interface WorkRequestApprovalStep {
  step: number;
  name: string;
  approver?: string;
  status: 'pending' | 'approved' | 'rejected' | 'skipped';
  approvedAt?: string;
  note?: string;
  required?: boolean;
}

export interface WorkRequestDecision {
  status?: WorkRequestDecisionStatus;
  decidedBy?: string;
  decidedAt?: string;
  note?: string;
  reason?: string;
  convertedWorkOrderId?: string;
}

export interface WorkRequestRouting {
  ruleId?: string;
  destinationType?: 'team' | 'user' | 'queue';
  destinationId?: string;
  queue?: string;
}

export interface WorkRequestAudit {
  createdBy?: string;
  updatedBy?: string;
  deletedBy?: string;
  deletedAt?: string;
}

export interface WorkRequestItem {
  _id: string;
  token: string;
  title: string;
  description?: string;
  requesterName: string;
  requesterEmail?: string;
  requesterPhone?: string;
  location?: string;
  assetTag?: string;
  asset?: string;
  category?: string;
  tags?: string[];
  tenantId?: string;
  siteId?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: WorkRequestStatus;
  rejectionReason?: string;
  triagedAt?: string;
  triagedBy?: string;
  approvalStatus?: 'draft' | 'pending' | 'approved' | 'rejected';
  approvalSteps?: WorkRequestApprovalStep[];
  currentApprovalStep?: number;
  slaResponseDueAt?: string;
  slaResolveDueAt?: string;
  slaRespondedAt?: string;
  slaResolvedAt?: string;
  attachments?: WorkRequestAttachment[];
  photos?: string[];
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string;
  decision?: WorkRequestDecision;
  audit?: WorkRequestAudit;
  routing?: WorkRequestRouting;
  requestForm?: string;
  requestType?: string;
  workOrder?: string;
}

export interface WorkRequestSummary {
  total: number;
  open: number;
  statusCounts: Record<WorkRequestStatus, number>;
  recent: WorkRequestItem[];
}

export interface ConvertWorkRequestResponse {
  workOrderId: string;
  request: WorkRequestItem;
  alreadyConverted?: boolean;
}

export const fetchWorkRequestSummary = async () => {
  const response = await http.get<WorkRequestSummary>('/work-requests/summary');
  return response.data;
};

export const fetchWorkRequests = async (filters?: {
  status?: WorkRequestStatus | 'all';
  priority?: WorkRequestItem['priority'] | 'all';
  search?: string;
  requestType?: string;
  siteId?: string;
  page?: number;
  pageSize?: number;
  includeDeleted?: boolean;
}): Promise<PaginatedResult<WorkRequestItem>> => {
  const params: Record<string, string | number | boolean> = {};
  const resolvedPageSize = filters?.pageSize ?? 200;
  if (filters?.status && filters.status !== 'all') params.status = filters.status;
  if (filters?.priority && filters.priority !== 'all') params.priority = filters.priority;
  if (filters?.search) params.search = filters.search;
  if (filters?.requestType) params.requestType = filters.requestType;
  if (filters?.siteId) params.siteId = filters.siteId;
  if (filters?.page) params.page = filters.page;
  if (resolvedPageSize) params.pageSize = resolvedPageSize;
  if (filters?.includeDeleted !== undefined) params.includeDeleted = filters.includeDeleted;
  const response = await http.get<PaginatedResult<WorkRequestItem>>('/work-requests', { params });
  return response.data;
};

export const fetchWorkRequest = async (requestId: string) => {
  const response = await http.get<WorkRequestItem>(`/work-requests/${requestId}`);
  return response.data;
};

export const updateWorkRequestStatus = async (
  requestId: string,
  payload: { status: WorkRequestDecisionStatus; reason?: string; note?: string },
) => {
  const response = await http.patch<WorkRequestItem>(`/work-requests/${requestId}/status`, payload);
  return response.data;
};

export const convertWorkRequest = async (requestId: string) => {
  const response = await http.post<ConvertWorkRequestResponse>(`/work-requests/${requestId}/convert`, {});
  return response.data;
};
