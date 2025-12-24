/*
 * SPDX-License-Identifier: MIT
 */

import http from '@/lib/http';
import type { ProcedureTemplateSummary, ProcedureTemplateVersion } from '@/types';

export const fetchProcedureTemplates = async () =>
  http.get<ProcedureTemplateSummary[]>('/pm/procedures').then((res) => res.data);

export const createProcedureTemplate = async (payload: {
  name: string;
  description?: string;
  category?: string;
}) => http.post<ProcedureTemplateSummary>('/pm/procedures', payload).then((res) => res.data);

export const updateProcedureTemplate = async (templateId: string, payload: Partial<{
  name: string;
  description?: string;
  category?: string;
}>) =>
  http.put<ProcedureTemplateSummary>(`/pm/procedures/${templateId}`, payload).then((res) => res.data);

export const fetchProcedureVersions = async (templateId: string) =>
  http
    .get<ProcedureTemplateVersion[]>(`/pm/procedures/${templateId}/versions`)
    .then((res) => res.data);

export const createProcedureVersion = async (
  templateId: string,
  payload: {
    durationMinutes: number;
    safetySteps: string[];
    steps?: string[];
    notes?: string;
    requiredParts?: { partId: string; quantity?: number }[];
    requiredTools?: { toolName: string; quantity?: number }[];
  },
) =>
  http
    .post<ProcedureTemplateVersion>(`/pm/procedures/${templateId}/versions`, payload)
    .then((res) => res.data);

export const publishProcedureVersion = async (versionId: string) =>
  http.post<ProcedureTemplateVersion>(`/pm/versions/${versionId}/publish`).then((res) => res.data);
