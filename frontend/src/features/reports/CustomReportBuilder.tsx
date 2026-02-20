/*
 * SPDX-License-Identifier: MIT
 */

import { useMemo, useState } from 'react';
import { Save, Download, PlayCircle } from 'lucide-react';
import { saveAs } from 'file-saver';

import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import DataTable from '@/components/common/DataTable';
import Input from '@/components/common/Input';
import type {
  CustomReportResponse,
  ReportField,
  ReportFilter,
  ReportTemplate,
  ReportTemplateInput,
} from '@/types';
import {
  useCustomReport,
  useExportCustomReport,
  useReportTemplates,
  useSaveReportTemplate,
  useUpdateReportTemplate,
} from './hooks';

const fieldOptions: Array<{ value: ReportField; label: string }> = [
  { value: 'title', label: 'Title' },
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Priority' },
  { value: 'type', label: 'Type' },
  { value: 'assetName', label: 'Asset' },
  { value: 'assigneeName', label: 'Assignee' },
  { value: 'siteId', label: 'Site' },
  { value: 'createdAt', label: 'Created' },
  { value: 'dueDate', label: 'Due date' },
  { value: 'completedAt', label: 'Completed' },
  { value: 'totalCost', label: 'Total cost' },
  { value: 'downtimeMinutes', label: 'Downtime (min)' },
  { value: 'laborHours', label: 'Labor hours' },
];

const operatorOptions: ReportFilter['operator'][] = ['eq', 'ne', 'in', 'contains', 'gte', 'lte'];

const defaultFilters: Array<ReportFilter & { value: string | number | (string | number)[] }> = [
  { field: 'status', operator: 'in', value: ['in_progress', 'assigned', 'pending_approval'] },
];

const parseFilterValue = (value: ReportFilter['value']) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.includes(',')) {
    return value.split(',').map((item) => item.trim());
  }
  if (typeof value === 'string') return value.trim();
  return value;
};

const derivePayloadFilters = (
  filters: Array<ReportFilter & { value: string | number | (string | number)[] }>,
): ReportFilter[] =>
  filters
    .filter((filter) => filter.value !== '')
    .map((filter) => ({
      field: filter.field,
      operator: filter.operator,
      value: parseFilterValue(filter.value),
    }));

const defaultFields: ReportField[] = ['title', 'status', 'priority', 'assetName', 'assigneeName'];

type EditableTemplate = Pick<ReportTemplateInput, 'name' | 'description' | 'fields' | 'filters' | 'groupBy' | 'dateRange'>;

export default function CustomReportBuilder() {
  const [selectedFields, setSelectedFields] = useState<ReportField[]>(defaultFields);
  const [groupBy, setGroupBy] = useState<ReportField[]>([]);
  const [filters, setFilters] = useState<Array<ReportFilter & { value: string | number | (string | number)[] }>>(defaultFilters);
  const [dateRange, setDateRange] = useState<{ from?: string; to?: string }>({});
  const [templateDraft, setTemplateDraft] = useState<EditableTemplate>({
    name: '',
    description: '',
    fields: defaultFields,
    filters: defaultFilters,
    groupBy: [],
    dateRange: {},
  });
  const [activeTemplateId, setActiveTemplateId] = useState<string | undefined>(undefined);
  const [reportData, setReportData] = useState<CustomReportResponse | null>(null);

  const customReport = useCustomReport();
  const exportReport = useExportCustomReport();
  const templatesQuery = useReportTemplates();
  const saveTemplate = useSaveReportTemplate();
  const updateTemplate = useUpdateReportTemplate();

  const activeTemplate = useMemo(
    () => templatesQuery.data?.find((template) => template.id === activeTemplateId),
    [activeTemplateId, templatesQuery.data],
  );

  const toggleField = (field: ReportField) => {
    setSelectedFields((prev) =>
      prev.includes(field) ? prev.filter((item) => item !== field) : [...prev, field],
    );
  };

  const toggleGroupBy = (field: ReportField) => {
    setGroupBy((prev) => (prev.includes(field) ? prev.filter((item) => item !== field) : [...prev, field]));
  };

  const updateFilterField = (
    index: number,
    updater: Partial<{ field: ReportField; operator: ReportFilter['operator']; value: string | number | (string | number)[] }>,
  ) => {
    setFilters((prev) => prev.map((filter, idx) => (idx === index ? { ...filter, ...updater } : filter)));
  };

  const addFilter = () => {
    setFilters((prev) => [...prev, { field: 'status', operator: 'eq', value: '' }]);
  };

  const removeFilter = (index: number) => {
    setFilters((prev) => prev.filter((_, idx) => idx !== index));
  };

  const buildPayload = (): ReportTemplateInput => ({
    name: templateDraft.name || 'Custom report',
    description: templateDraft.description,
    fields: selectedFields,
    groupBy,
    filters: derivePayloadFilters(filters),
    dateRange: dateRange.from || dateRange.to ? { ...dateRange } : undefined,
    tenantId: '',
  });

  const handleRunReport = () => {
    const payload = buildPayload();
    customReport.mutate(payload, {
      onSuccess: (data) => {
        setReportData(data);
      },
    });
  };

  const handleExport = (format: 'csv' | 'pdf') => {
    const payload = { ...buildPayload(), format };
    exportReport.mutate(payload, {
      onSuccess: (blob) => {
        const filename = templateDraft.name ? templateDraft.name.toLowerCase().replace(/\s+/g, '-') : 'custom-report';
        saveAs(blob, `${filename}.${format}`);
      },
    });
  };

  const persistTemplate = () => {
    const payload = buildPayload();
    if (activeTemplateId) {
      updateTemplate.mutate(
        { id: activeTemplateId, payload },
        {
          onSuccess: () => {
            templatesQuery.refetch().catch(() => undefined);
          },
        },
      );
    } else {
      saveTemplate.mutate(payload, {
        onSuccess: (created) => {
          setActiveTemplateId(created.id);
          setTemplateDraft((prev) => ({ ...prev, name: created.name, description: created.description }));
          templatesQuery.refetch().catch(() => undefined);
        },
      });
    }
  };

  const applyTemplate = (template: ReportTemplate) => {
    setActiveTemplateId(template.id);
    setSelectedFields(template.fields);
    setGroupBy(template.groupBy ?? []);
    setFilters(
      (template.filters ?? []).map((filter: ReportFilter) => ({
        ...filter,
        value: Array.isArray(filter.value) ? filter.value.join(',') : filter.value ?? '',
      })),
    );
    setDateRange({
      from: template.dateRange?.from ? String(template.dateRange.from).slice(0, 10) : undefined,
      to: template.dateRange?.to ? String(template.dateRange.to).slice(0, 10) : undefined,
    });
    setTemplateDraft({
      name: template.name,
      description: template.description,
      fields: template.fields,
      filters: template.filters,
      groupBy: template.groupBy,
      dateRange: template.dateRange,
    });
  };

  type CustomReportRow = CustomReportResponse['rows'][number] & { __id: string };

  const rowsWithIds = useMemo<CustomReportRow[]>(
    () =>
      reportData?.rows.map((row: CustomReportResponse['rows'][number], index: number) => ({
        __id: `row-${index}`,
        ...row,
      })) ?? [],
    [reportData],
  );

  const columns = useMemo<Array<{ header: string; accessor: keyof CustomReportRow }>>(
    () =>
      (reportData?.columns ?? []).map((column: CustomReportResponse['columns'][number]) => ({
        header: column.label,
        accessor: column.key as keyof CustomReportRow,
      })),
    [reportData?.columns],
  );

  return (
    <Card
      title="Custom report builder"
      subtitle="Create, save, and export ad-hoc maintenance reports with your own filters."
      className="border border-neutral-200 shadow-sm"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-neutral-700">Template</label>
            <select
              className="border border-neutral-300 rounded-md px-3 py-2 text-sm"
              value={activeTemplateId ?? ''}
              onChange={(event) => {
                const nextTemplate = templatesQuery.data?.find((item) => item.id === event.target.value);
                if (nextTemplate) applyTemplate(nextTemplate);
                else setActiveTemplateId(undefined);
              }}
            >
              <option value="">Select a saved template</option>
              {(templatesQuery.data ?? []).map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Template name"
              placeholder="e.g. High priority by site"
              value={templateDraft.name}
              onChange={(event) => setTemplateDraft((prev) => ({ ...prev, name: event.target.value }))}
            />
            <Input
              label="Description"
              placeholder="Optional description"
              value={templateDraft.description ?? ''}
              onChange={(event) => setTemplateDraft((prev) => ({ ...prev, description: event.target.value }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-neutral-800">Fields</p>
            <div className="grid grid-cols-2 gap-2">
              {fieldOptions.map((field) => (
                <label key={field.value} className="flex items-center gap-2 text-sm text-neutral-700">
                  <input
                    type="checkbox"
                    checked={selectedFields.includes(field.value)}
                    onChange={() => toggleField(field.value)}
                  />
                  {field.label}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-neutral-800">Group by</p>
            <div className="grid grid-cols-2 gap-2">
              {fieldOptions.map((field) => (
                <label key={field.value} className="flex items-center gap-2 text-sm text-neutral-700">
                  <input
                    type="checkbox"
                    checked={groupBy.includes(field.value)}
                    onChange={() => toggleGroupBy(field.value)}
                  />
                  {field.label}
                </label>
              ))}
            </div>
            <p className="text-xs text-neutral-500">Grouping adds aggregate counts, cost, downtime, and labor averages.</p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-neutral-800">Date range</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input
                label="From"
                type="date"
                value={dateRange.from ?? ''}
                onChange={(event) => setDateRange((prev) => ({ ...prev, from: event.target.value }))}
              />
              <Input
                label="To"
                type="date"
                value={dateRange.to ?? ''}
                onChange={(event) => setDateRange((prev) => ({ ...prev, to: event.target.value }))}
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-neutral-800">Filters</p>
            <Button variant="outline" size="sm" onClick={addFilter}>
              Add filter
            </Button>
          </div>
          <div className="space-y-2">
            {filters.map((filter, index) => (
              <div key={`${filter.field}-${index}`} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                <div className="md:col-span-3">
                  <label className="text-xs text-neutral-600">Field</label>
                  <select
                    className="mt-1 w-full border border-neutral-300 rounded-md px-3 py-2 text-sm"
                    value={filter.field}
                    onChange={(event) =>
                      updateFilterField(index, { field: event.target.value as ReportField })
                    }
                  >
                    {fieldOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-neutral-600">Operator</label>
                  <select
                    className="mt-1 w-full border border-neutral-300 rounded-md px-3 py-2 text-sm"
                    value={filter.operator}
                    onChange={(event) =>
                      updateFilterField(index, { operator: event.target.value as ReportFilter['operator'] })
                    }
                  >
                    {operatorOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-6">
                  <Input
                    label="Value"
                    value={Array.isArray(filter.value) ? filter.value.join(',') : String(filter.value ?? '')}
                    onChange={(event) => updateFilterField(index, { value: event.target.value })}
                    placeholder={filter.operator === 'in' ? 'Comma separated values' : 'Enter value'}
                  />
                </div>
                <div className="md:col-span-1 flex justify-end pb-1 md:pb-0">
                  <Button variant="ghost" size="sm" onClick={() => removeFilter(index)}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button icon={<PlayCircle className="h-4 w-4" />} onClick={handleRunReport} loading={customReport.isPending}>
            Run report
          </Button>
          <Button
            variant="secondary"
            icon={<Download className="h-4 w-4" />}
            onClick={() => handleExport('csv')}
            loading={exportReport.isPending}
          >
            Export CSV
          </Button>
          <Button
            variant="secondary"
            icon={<Download className="h-4 w-4" />}
            onClick={() => handleExport('pdf')}
            loading={exportReport.isPending}
          >
            Export PDF
          </Button>
          <Button
            variant="outline"
            icon={<Save className="h-4 w-4" />}
            onClick={persistTemplate}
            loading={saveTemplate.isPending || updateTemplate.isPending}
          >
            {activeTemplate ? 'Update template' : 'Save template'}
          </Button>
        </div>

        {reportData && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-base font-semibold text-neutral-800">Results</p>
                <p className="text-sm text-neutral-500">{reportData.total} rows returned</p>
              </div>
              {reportData.groupBy.length > 0 && (
                <p className="text-sm text-neutral-600">Grouped by {reportData.groupBy.join(', ')}</p>
              )}
            </div>
            <DataTable
              keyField="__id"
              data={rowsWithIds}
              columns={columns}
              isLoading={customReport.isPending}
              emptyMessage="Run a query to see results"
            />
          </div>
        )}
      </div>
    </Card>
  );
}

