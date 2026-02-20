/*
 * SPDX-License-Identifier: MIT
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ReportQueryRequest, ReportTemplate, ReportTemplateInput } from '@/types';
import {
  exportCustomReport,
  fetchReportTemplate,
  listReportTemplates,
  runCustomReport,
  saveReportTemplate,
  updateReportTemplate,
} from '@/api/reports';

export const REPORT_TEMPLATES_QUERY_KEY = 'report-templates';

export const useCustomReport = () =>
  useMutation({
    mutationFn: (payload: ReportQueryRequest) => runCustomReport(payload),
  });

export const useExportCustomReport = () =>
  useMutation({
    mutationFn: (payload: ReportQueryRequest & { format: 'csv' | 'pdf' }) => exportCustomReport(payload),
  });

export const useReportTemplates = () =>
  useQuery<ReportTemplate[]>({
    queryKey: [REPORT_TEMPLATES_QUERY_KEY],
    queryFn: listReportTemplates,
    staleTime: 60_000,
  });

export const useReportTemplate = (id: string | undefined) =>
  useQuery<ReportTemplate | undefined>({
    queryKey: [REPORT_TEMPLATES_QUERY_KEY, id],
    queryFn: () => (id ? fetchReportTemplate(id) : Promise.resolve(undefined)),
    enabled: Boolean(id),
  });

export const useSaveReportTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ReportTemplateInput) => saveReportTemplate(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [REPORT_TEMPLATES_QUERY_KEY] }),
  });
};

export const useUpdateReportTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReportTemplateInput }) => updateReportTemplate(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [REPORT_TEMPLATES_QUERY_KEY] }),
  });
};

