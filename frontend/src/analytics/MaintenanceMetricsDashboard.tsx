/*
 * SPDX-License-Identifier: MIT
 */

import { useMemo, useState } from 'react';
import { saveAs } from 'file-saver';

import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import { useToast } from '@/context/ToastContext';
import {
  exportMaintenanceMetrics,
  type MaintenanceMetricsFilters,
  useMaintenanceMetricsQuery,
} from '@/analytics/maintenanceMetrics';

const formatNumber = (value: number, decimals = 2) =>
  Number.isFinite(value) ? value.toFixed(decimals) : '--';

const defaultDate = (offsetDays: number) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
};

const MaintenanceMetricsDashboard = () => {
  const { addToast } = useToast();
  const [formFilters, setFormFilters] = useState<MaintenanceMetricsFilters>({
    startDate: defaultDate(-30),
    endDate: defaultDate(0),
  });
  const [appliedFilters, setAppliedFilters] = useState<MaintenanceMetricsFilters>(formFilters);

  const { data, isLoading, error } = useMaintenanceMetricsQuery(appliedFilters);

  const metricsCards = useMemo<Array<{ label: string; value: string; subtext: string }>>(
    () => [
      {
        label: 'MTTR (hrs)',
        value: data ? formatNumber(data.mttr, 2) : '--',
        subtext: 'Mean time to repair',
      },
      {
        label: 'MTBF (hrs)',
        value: data ? formatNumber(data.mtbf, 2) : '--',
        subtext: 'Mean time between failures',
      },
      {
        label: 'Backlog',
        value: data ? String(data.backlog) : '--',
        subtext: 'Open work orders',
      },
      {
        label: 'PM Compliance',
        value: data ? `${formatNumber(data.pmCompliance.percentage, 1)}%` : '--',
        subtext: data
          ? `${data.pmCompliance.completed} of ${data.pmCompliance.total} preventive tasks`
          : 'Preventive maintenance completion',
      },
    ],
    [data],
  );

  const handleApplyFilters = () => {
    setAppliedFilters(formFilters);
  };

  const handleResetFilters = () => {
    const next = { startDate: defaultDate(-30), endDate: defaultDate(0) };
    setFormFilters(next);
    setAppliedFilters(next);
  };

  const handleExport = async (format: 'csv' | 'xlsx') => {
    try {
      const blob = await exportMaintenanceMetrics(format, appliedFilters);
      saveAs(blob, `maintenance-metrics.${format}`);
      addToast(`Maintenance metrics exported (${format.toUpperCase()})`, 'success');
    } catch (err) {
      console.error('Failed to export maintenance metrics', err);
      addToast('Failed to export maintenance metrics', 'error');
    }
  };

  const hasError = Boolean(error);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[var(--wp-color-border)] bg-[color-mix(in_srgb,var(--wp-color-surface)_75%,transparent)] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--wp-color-text)]">Maintenance Analytics Dashboard</h1>
            <p className="mt-2 text-sm text-[var(--wp-color-text-muted)]">
              Track reliability, backlog, and preventive maintenance performance for the selected window.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => handleExport('csv')}>
              Export CSV
            </Button>
            <Button variant="secondary" onClick={() => handleExport('xlsx')}>
              Export Excel
            </Button>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-4">
          <div className="flex flex-col">
            <label className="text-xs uppercase text-[var(--wp-color-text-muted)]" htmlFor="maintenance-start">
              Start date
            </label>
            <input
              id="maintenance-start"
              type="date"
              className="mt-1 rounded-md border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] px-3 py-2 text-sm text-[var(--wp-color-text)]"
              value={formFilters.startDate ?? ''}
              onChange={(event) =>
                setFormFilters((prev) => ({ ...prev, startDate: event.target.value || undefined }))
              }
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs uppercase text-[var(--wp-color-text-muted)]" htmlFor="maintenance-end">
              End date
            </label>
            <input
              id="maintenance-end"
              type="date"
              className="mt-1 rounded-md border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] px-3 py-2 text-sm text-[var(--wp-color-text)]"
              value={formFilters.endDate ?? ''}
              onChange={(event) =>
                setFormFilters((prev) => ({ ...prev, endDate: event.target.value || undefined }))
              }
            />
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={handleApplyFilters}>Apply</Button>
            <Button variant="secondary" onClick={handleResetFilters}>
              Reset
            </Button>
          </div>
        </div>
      </div>

      {hasError && (
        <Card title="Maintenance metrics" className="border border-rose-500/40 bg-rose-500/10">
          <p className="text-sm text-rose-200">Failed to load metrics. Please try again.</p>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {metricsCards.map((card) => (
          <Card key={card.label} title={card.label} subtitle={card.subtext}>
            <div className="text-2xl font-semibold text-[var(--wp-color-text)]">
              {isLoading ? 'Loading...' : card.value}
            </div>
          </Card>
        ))}
      </div>

      {data && (
        <Card title="Performance details">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-[var(--wp-color-border)] bg-[var(--wp-color-surface-elevated)] p-4">
              <p className="text-xs uppercase tracking-wide text-[var(--wp-color-text-muted)]">PM completion</p>
              <p className="mt-2 text-lg font-semibold text-[var(--wp-color-text)]">
                {data.pmCompliance.completed} completed / {data.pmCompliance.total} scheduled
              </p>
              <p className="text-sm text-[var(--wp-color-text-muted)]">
                {formatNumber(data.pmCompliance.percentage, 1)}% compliance in this window.
              </p>
            </div>
            <div className="rounded-lg border border-[var(--wp-color-border)] bg-[var(--wp-color-surface-elevated)] p-4">
              <p className="text-xs uppercase tracking-wide text-[var(--wp-color-text-muted)]">Backlog load</p>
              <p className="mt-2 text-lg font-semibold text-[var(--wp-color-text)]">{data.backlog} open orders</p>
              <p className="text-sm text-[var(--wp-color-text-muted)]">
                Keep backlog under control by clearing overdue work orders and scheduling PM.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default MaintenanceMetricsDashboard;
