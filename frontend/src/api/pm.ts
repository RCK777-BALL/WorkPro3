/*
 * SPDX-License-Identifier: MIT
 */

import http from '@/lib/http';
import type {
  PMTemplate,
  PMTemplateAssignment,
  PMTemplateChecklistItem,
  PMTemplateRequiredPart,
  PMTemplateUpsertInput,
} from '@/types';

export interface AssignmentPayload {
  assetId: string;
  interval?: string;
  trigger?: { type: 'time' | 'meter'; meterThreshold?: number };
  usageMetric?: 'runHours' | 'cycles';
  usageTarget?: number;
  usageLookbackDays?: number;
  procedureTemplateId?: string;
  checklist?: Array<Omit<PMTemplateChecklistItem, 'id'>>;
  requiredParts?: Array<Omit<PMTemplateRequiredPart, 'id' | 'partName'>>;
}

const pmTemplateRequestOptions = {
  headers: {
    'x-site-id': '',
  },
};

export const fetchPmTemplates = async (): Promise<PMTemplate[]> => {
  const res = await http.get<PMTemplate[]>('/pm/templates', pmTemplateRequestOptions);
  return res.data;
};

export const fetchPmTemplate = async (templateId: string): Promise<PMTemplate> => {
  const res = await http.get<PMTemplate>(`/pm/templates/${templateId}`, pmTemplateRequestOptions);
  return res.data;
};

export const createPmTemplate = async (payload: PMTemplateUpsertInput): Promise<PMTemplate> => {
  const res = await http.post<PMTemplate>('/pm/templates', payload, pmTemplateRequestOptions);
  return res.data;
};

export const updatePmTemplate = async (
  templateId: string,
  payload: PMTemplateUpsertInput,
): Promise<PMTemplate> => {
  const res = await http.put<PMTemplate>(
    `/pm/templates/${templateId}`,
    payload,
    pmTemplateRequestOptions,
  );
  return res.data;
};

export const deletePmTemplate = async (templateId: string): Promise<{ id: string }> => {
  const res = await http.delete<{ id: string }>(
    `/pm/templates/${templateId}`,
    pmTemplateRequestOptions,
  );
  return res.data;
};

export const upsertPmAssignment = async (
  templateId: string,
  payload: AssignmentPayload & { assignmentId?: string },
): Promise<PMTemplateAssignment> => {
  const { assignmentId, ...rest } = payload;
  if (assignmentId) {
    const res = await http.put<PMTemplateAssignment>(
      `/pm/templates/${templateId}/assignments/${assignmentId}`,
      rest,
      pmTemplateRequestOptions,
    );
    return res.data;
  }
  const res = await http.post<PMTemplateAssignment>(
    `/pm/templates/${templateId}/assignments`,
    rest,
    pmTemplateRequestOptions,
  );
  return res.data;
};

export const deletePmAssignment = async (templateId: string, assignmentId: string) => {
  const res = await http.delete<{ id: string }>(
    `/pm/templates/${templateId}/assignments/${assignmentId}`,
    pmTemplateRequestOptions,
  );
  return res.data;
};
