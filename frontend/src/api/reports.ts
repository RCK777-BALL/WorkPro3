/*
 * SPDX-License-Identifier: MIT
 */

import http from '@/lib/http';
import type {
  CustomReportResponse,
  ReportQueryRequest,
  ReportTemplate,
  ReportTemplateInput,
} from '@/types';

export const runCustomReport = async (payload: ReportQueryRequest): Promise<CustomReportResponse> => {
  const res = await http.post<CustomReportResponse>('/custom-reports/query', payload);
  return res.data;
};

export const exportCustomReport = async (
  payload: ReportQueryRequest & { format: 'csv' | 'pdf' },
): Promise<Blob> => {
  const res = await http.post<ArrayBuffer>('/custom-reports/export', payload, { responseType: 'arraybuffer' });
  const contentType = res.headers['content-type'] ?? 'application/octet-stream';
  return new Blob([res.data], { type: contentType });
};

export const listReportTemplates = async (): Promise<ReportTemplate[]> => {
  const res = await http.get<ReportTemplate[]>('/custom-reports/templates');
  return res.data;
};

export const saveReportTemplate = async (payload: ReportTemplateInput): Promise<ReportTemplate> => {
  const res = await http.post<ReportTemplate>('/custom-reports/templates', payload);
  return res.data;
};

export const updateReportTemplate = async (
  id: string,
  payload: ReportTemplateInput,
): Promise<ReportTemplate> => {
  const res = await http.put<ReportTemplate>(`/custom-reports/templates/${id}`, payload);
  return res.data;
};

export const fetchReportTemplate = async (id: string): Promise<ReportTemplate> => {
  const res = await http.get<ReportTemplate>(`/custom-reports/templates/${id}`);
  return res.data;
};
