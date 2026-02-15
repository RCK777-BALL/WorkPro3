/*
 * SPDX-License-Identifier: MIT
 */

import { useMutation, useQuery, useQueryClient } from 'react-query';
import type { CustomReportResponse, ReportQueryRequest, ReportTemplate, ReportTemplateInput } from '@/types';
import {
  exportCustomReport,
  fetchReportTemplate,
  listReportTemplates,
  runCustomReport,
  saveReportTemplate,
  updateReportTemplate,
} from '@/api/reports';

export const REPORT_TEMPLATES_QUERY_KEY = 'report-templates';

export const useCustomReport = () => useMutation((payload: ReportQueryRequest) => runCustomReport(payload));

export const useExportCustomReport = () =>
  useMutation((payload: ReportQueryRequest & { format: 'csv' | 'pdf' }) => exportCustomReport(payload));

export const useReportTemplates = () => useQuery<ReportTemplate[]>(REPORT_TEMPLATES_QUERY_KEY, listReportTemplates, { staleTime: 60_000 });

export const useReportTemplate = (id: string | undefined) =>
  useQuery<ReportTemplate | undefined>(
    [REPORT_TEMPLATES_QUERY_KEY, id],
    () => (id ? fetchReportTemplate(id) : Promise.resolve(undefined)),
    { enabled: Boolean(id) },
  );

export const useSaveReportTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation((payload: ReportTemplateInput) => saveReportTemplate(payload), {
    onSuccess: () => queryClient.invalidateQueries(REPORT_TEMPLATES_QUERY_KEY),
  });
};

export const useUpdateReportTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation(
    ({ id, payload }: { id: string; payload: ReportTemplateInput }) => updateReportTemplate(id, payload),
    {
      onSuccess: () => queryClient.invalidateQueries(REPORT_TEMPLATES_QUERY_KEY),
    },
  );
};
