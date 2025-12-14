// shared/reports.ts

import type { TenantScoped } from '../../shared/types/http';
import type { AuthRole } from '../../shared/types/auth';

export type ReportField =
  | 'title'
  | 'status'
  | 'priority'
  | 'type'
  | 'assetName'
  | 'assetStatus'
  | 'assetLocation'
  | 'assetCriticality'
  | 'assetType'
  | 'assetPurchaseCost'
  | 'assetPurchaseDate'
  | 'assigneeName'
  | 'createdAt'
  | 'dueDate'
  | 'completedAt'
  | 'totalCost'
  | 'downtimeMinutes'
  | 'laborHours'
  | 'laborCost'
  | 'partName'
  | 'partNumber'
  | 'partCategory'
  | 'partQuantity'
  | 'partUnitCost'
  | 'iotMetric'
  | 'iotValue'
  | 'iotDeviceId'
  | 'iotTimestamp'
  | 'iotAssetName'
  | 'siteId';

export type ReportModel = 'workOrders' | 'assets' | 'labor' | 'parts' | 'iotEvents';

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

export interface ReportCalculation {
  operation: 'count' | 'sum' | 'avg';
  field?: ReportField;
  as?: string;
}

export interface ReportVisibility {
  scope: 'private' | 'tenant' | 'roles';
  roles?: AuthRole[];
}

export interface ReportQueryRequest extends TenantScoped {
  fields: ReportField[];
  filters?: ReportFilter[];
  groupBy?: ReportField[];
  dateRange?: ReportDateRange;
  limit?: number;
  model?: ReportModel;
  calculations?: ReportCalculation[];
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
  calculations: ReportCalculation[];
}

export interface ReportTemplateInput extends ReportQueryRequest {
  name: string;
  description?: string;
  visibility?: ReportVisibility;
  shareId?: string;
}

export interface ReportTemplate extends ReportTemplateInput {
  id: string;
  ownerId: string;
  tenantId: string;
  createdAt?: string;
  updatedAt?: string;
}
