/*
 * SPDX-License-Identifier: MIT
 */

import { api } from '@/lib/api';

export interface WorkflowRuleInput {
  name: string;
  scope: 'work_order' | 'work_request';
  siteId?: string;
  slaResponseMinutes?: number;
  slaResolveMinutes?: number;
  approvalSteps?: Array<{ step: number; name: string; approver?: string; required?: boolean }>;
  escalations?: Array<{
    trigger: 'response' | 'resolve';
    thresholdMinutes?: number;
    escalateTo?: string[];
    channel?: 'email' | 'sms' | 'push';
    maxRetries?: number;
    retryBackoffMinutes?: number;
  }>;
  templates?: { emailSubject?: string; emailBody?: string; smsBody?: string };
  isDefault?: boolean;
}

export const listWorkflowRules = async () => {
  const { data } = await api.get('/api/admin/workflow-rules');
  return data?.data ?? [];
};

export const createWorkflowRule = async (input: WorkflowRuleInput) => {
  const { data } = await api.post('/api/admin/workflow-rules', input);
  return data?.data;
};

export const updateWorkflowRule = async (id: string, input: Partial<WorkflowRuleInput>) => {
  const { data } = await api.put(`/api/admin/workflow-rules/${id}`, input);
  return data?.data;
};

