// shared/reports.ts

import type { TenantScoped } from '../../shared/types/http';

export type ReportField =
  | 'title'
  | 'status'
  | 'priority'
  | 'type'
  | 'assetName'
  | 'assigneeName'
  | 'createdAt'
  | 'dueDate'
  | 'completedAt'
  | 'totalCost'
  | 'downtimeMinutes'
  | 'laborHours'
  | 'siteId';

export type ReportFilterOperator = 'eq' | 'ne' | 'in' | 'contains' | 'gte' | 'lte';

export interface ReportFilter {
  field: ReportField;
  operator: ReportFilterOperator;
  value: string | number | (string | number)[];
}

export interface ReportDateRange {
  from?: string | Date;
  to?: string | Date;
}

export interface ReportQueryRequest extends TenantScoped {
  fields: ReportField[];
  filters?: ReportFilter[];
  groupBy?: ReportField[];
  dateRange?: ReportDateRange;
  limit?: number;
}

export interface ReportColumn {
  key: string;
  label: string;
}

export type ReportRowValue = string | number | null;

export interface CustomReportRow {
  [key: string]: ReportRowValue;
}

export interface CustomReportResponse {
  columns: ReportColumn[];
  rows: CustomReportRow[];
  total: number;
  groupBy: ReportField[];
  filters: ReportFilter[];
}

export interface ReportTemplateInput extends ReportQueryRequest {
  name: string;
  description?: string;
}

export interface ReportTemplate extends ReportTemplateInput {
  id: string;
  ownerId: string;
  tenantId: string;
  createdAt?: string;
  updatedAt?: string;
}
