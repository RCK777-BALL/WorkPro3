/*
 * SPDX-License-Identifier: MIT
 */

import http from '@/lib/http';
import type {
  PMTemplate,
  PMTemplateAssignment,
  PMTemplateChecklistItem,
  PMTemplateRequiredPart,
  PMTemplateLibraryItem,
} from '@/types';

export interface AssignmentPayload {
  assetId: string;
  interval: string;
  usageMetric?: 'runHours' | 'cycles';
  usageTarget?: number;
  usageLookbackDays?: number;
  checklist?: Array<Omit<PMTemplateChecklistItem, 'id'>>;
  requiredParts?: Array<Omit<PMTemplateRequiredPart, 'id' | 'partName'>>;
}

export const fetchPmTemplates = async (): Promise<PMTemplate[]> => {
  const res = await http.get<PMTemplate[]>('/pm/templates');
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
    );
    return res.data;
  }
  const res = await http.post<PMTemplateAssignment>(`/pm/templates/${templateId}/assignments`, rest);
  return res.data;
};

export const deletePmAssignment = async (templateId: string, assignmentId: string) => {
  const res = await http.delete<{ id: string }>(`/pm/templates/${templateId}/assignments/${assignmentId}`);
  return res.data;
};

export const fetchPmTemplateLibrary = async (): Promise<PMTemplateLibraryItem[]> => {
  const res = await http.get<PMTemplateLibraryItem[]>('/pm/templates/library');
  return res.data;
};

export const clonePmTemplate = async (templateId: string): Promise<PMTemplate> => {
  const res = await http.post<PMTemplate>(`/pm/templates/library/${templateId}/clone`);
  return res.data;
};
