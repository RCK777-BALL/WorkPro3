/*
 * SPDX-License-Identifier: MIT
 */

import http from '@/lib/http';
import type { PMTemplate, PMTemplateLibraryItem } from '@/types';

export const fetchTemplateLibrary = async (): Promise<PMTemplateLibraryItem[]> => {
  const res = await http.get<PMTemplateLibraryItem[]>('/templates/library');
  return res.data;
};

export const cloneTemplateIntoTenant = async (templateId: string): Promise<PMTemplate> => {
  const res = await http.post<PMTemplate>(`/templates/library/${templateId}/clone`);
  return res.data;
};
