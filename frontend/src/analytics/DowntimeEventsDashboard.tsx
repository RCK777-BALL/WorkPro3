/*
 * SPDX-License-Identifier: MIT
 */

import { useMemo, useState } from 'react';
import { saveAs } from 'file-saver';

import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import DataTable from '@/components/common/DataTable';
import { useToast } from '@/context/ToastContext';
import { useDowntimeAssetsQuery, useDowntimeWorkOrdersQuery } from '@/api/downtime';
import {
  exportDowntimeEvents,
  type DowntimeEventFilters,
  useDowntimeEventsQuery,
} from '@/analytics/downtimeEvents';

const formatDateTime = (value?: string) =>
  value ? new Date(value).toLocaleString() : '--';

const formatDuration = (start?: string, end?: string) => {
  if (!start || !end) return '--';
  const minutes = (new Date(end).getTime() - new Date(start).getTime()) / 60000;
  return `${Math.max(0, minutes).toFixed(1)} min`;
};

const DowntimeEventsDashboard = () => {
  const { addToast } = useToast();
  const [filters, setFilters] = useState<DowntimeEventFilters>({ activeOnly: false });
  const [appliedFilters, setAppliedFilters] = useState<DowntimeEventFilters>({ activeOnly: false });

  const { data: events = [], isLoading } = useDowntimeEventsQuery(appliedFilters);
  const { data: assets = [] } = useDowntimeAssetsQuery();
  const { data: workOrders = [] } = useDowntimeWorkOrdersQuery();

  const assetMap = useMemo(
    () => new Map(assets.map((asset) => [asset.id, asset.name])),
    [assets],
  );
  const workOrderMap = useMemo(
    () => new Map(workOrders.map((order) => [order.id, order.title])),
    [workOrders],
  );

  const tableData = useMemo(
    () =>
      events.map((event) => ({
        id: event.id,
        asset: assetMap.get(event.assetId) ?? event.assetId,
        workOrder: event.workOrderId ? workOrderMap.get(event.workOrderId) ?? event.workOrderId : '--',
        start: event.start,
        end: event.end,
        causeCode: event.causeCode,
        reason: event.reason,
        impactMinutes: event.impactMinutes ?? '--',
      })),
    [events, assetMap, workOrderMap],
  );

  const handleApply = () => setAppliedFilters(filters);

  const handleReset = () => {
    const next = { activeOnly: false } as DowntimeEventFilters;
    setFilters(next);
    setAppliedFilters(next);
  };

  const handleExport = async (format: 'csv' | 'xlsx') => {
    try {
      const blob = await exportDowntimeEvents(format, appliedFilters);
      saveAs(blob, `downtime-events.${format}`);
      addToast(`Downtime events exported (${format.toUpperCase()})`, 'success');
    } catch (err) {
      console.error('Failed to export downtime events', err);
      addToast('Failed to export downtime events', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <Card title="Downtime Events" subtitle="Track downtime incidents with root-cause detail.">
        <div className="flex flex-wrap gap-4">
          <div className="flex flex-col">
            <label className="text-xs uppercase text-[var(--wp-color-text-muted)]" htmlFor="downtime-asset">
              Asset
            </label>
            <select
              id="downtime-asset"
              className="mt-1 rounded-md border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] px-3 py-2 text-sm text-[var(--wp-color-text)]"
              value={filters.assetId ?? ''}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, assetId: event.target.value || undefined }))
              }
            >
              <option value="">All assets</option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-xs uppercase text-[var(--wp-color-text-muted)]" htmlFor="downtime-workorder">
              Work order
            </label>
            <select
              id="downtime-workorder"
              className="mt-1 rounded-md border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] px-3 py-2 text-sm text-[var(--wp-color-text)]"
              value={filters.workOrderId ?? ''}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, workOrderId: event.target.value || undefined }))
              }
            >
              <option value="">All work orders</option>
              {workOrders.map((workOrder) => (
                <option key={workOrder.id} value={workOrder.id}>
                  {workOrder.title}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-xs uppercase text-[var(--wp-color-text-muted)]" htmlFor="downtime-cause">
              Cause code
            </label>
            <input
              id="downtime-cause"
              type="text"
              className="mt-1 rounded-md border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] px-3 py-2 text-sm text-[var(--wp-color-text)]"
              placeholder="e.g. electrical"
              value={filters.causeCode ?? ''}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, causeCode: event.target.value || undefined }))
              }
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs uppercase text-[var(--wp-color-text-muted)]" htmlFor="downtime-start">
              Start date
            </label>
            <input
              id="downtime-start"
              type="date"
              className="mt-1 rounded-md border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] px-3 py-2 text-sm text-[var(--wp-color-text)]"
              value={filters.start ?? ''}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, start: event.target.value || undefined }))
              }
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs uppercase text-[var(--wp-color-text-muted)]" htmlFor="downtime-end">
              End date
            </label>
            <input
              id="downtime-end"
              type="date"
              className="mt-1 rounded-md border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] px-3 py-2 text-sm text-[var(--wp-color-text)]"
              value={filters.end ?? ''}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, end: event.target.value || undefined }))
              }
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs uppercase text-[var(--wp-color-text-muted)]" htmlFor="downtime-active">
              Status
            </label>
            <select
              id="downtime-active"
              className="mt-1 rounded-md border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] px-3 py-2 text-sm text-[var(--wp-color-text)]"
              value={filters.activeOnly ? 'active' : 'all'}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, activeOnly: event.target.value === 'active' }))
              }
            >
              <option value="all">All events</option>
              <option value="active">Active only</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={handleApply}>Apply filters</Button>
          <Button variant="secondary" onClick={handleReset}>
            Reset
          </Button>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => handleExport('csv')}>
              Export CSV
            </Button>
            <Button variant="secondary" onClick={() => handleExport('xlsx')}>
              Export Excel
            </Button>
          </div>
        </div>
      </Card>

      <Card title="Event log" noPadding>
        <DataTable
          data={tableData}
          keyField="id"
          variant="dark"
          isLoading={isLoading}
          emptyMessage="No downtime events found."
          columns={[
            { header: 'Asset', accessor: 'asset' },
            { header: 'Work Order', accessor: 'workOrder' },
            {
              header: 'Start',
              accessor: (row) => formatDateTime(row.start),
            },
            {
              header: 'End',
              accessor: (row) => formatDateTime(row.end),
            },
            {
              header: 'Duration',
              accessor: (row) => formatDuration(row.start, row.end),
            },
            { header: 'Cause Code', accessor: 'causeCode' },
            { header: 'Reason', accessor: 'reason' },
            { header: 'Impact (min)', accessor: 'impactMinutes' },
          ]}
        />
      </Card>
    </div>
  );
};

export default DowntimeEventsDashboard;
