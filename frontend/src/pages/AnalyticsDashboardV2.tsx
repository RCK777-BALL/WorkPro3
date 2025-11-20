/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useState } from 'react';

import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import http from '@/lib/http';

interface Snapshot {
  mtbfHours: number;
  mttrHours: number;
  downtimeHours: number;
  pmCompliance: number;
  workOrderVolume: number;
  costPerAsset: number;
}

const formatNumber = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 2 });

export default function AnalyticsDashboardV2() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setLoading(true);
    http
      .get<Snapshot>('/analytics/dashboard/summary')
      .then((res) => setSnapshot(res.data))
      .finally(() => setLoading(false));
  }, []);

  const handleExport = async () => {
    try {
      setExporting(true);
      const res = await http.get('/analytics/dashboard/summary.csv', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'analytics-dashboard.csv';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const metrics: { label: string; value: string }[] = snapshot
    ? [
        { label: 'MTBF (hrs)', value: formatNumber(snapshot.mtbfHours) },
        { label: 'MTTR (hrs)', value: formatNumber(snapshot.mttrHours) },
        { label: 'Downtime (hrs)', value: formatNumber(snapshot.downtimeHours) },
        { label: 'PM Compliance', value: `${formatNumber(snapshot.pmCompliance)}%` },
        { label: 'WO Volume', value: formatNumber(snapshot.workOrderVolume) },
        { label: 'Cost / Asset', value: `$${formatNumber(snapshot.costPerAsset)}` },
      ]
    : [];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Analytics dashboard</h1>
          <p className="text-sm text-neutral-500">
            High-level KPIs with quick export for leadership reporting.
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleExport} loading={exporting} variant="outline">
            Export CSV
          </Button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {metrics.map((metric) => (
          <Card key={metric.label} className="space-y-1">
            <p className="text-xs uppercase text-neutral-500">{metric.label}</p>
            <p className="text-2xl font-semibold text-neutral-900">{metric.value}</p>
          </Card>
        ))}
        {!metrics.length && !loading && (
          <Card>
            <p className="text-sm text-neutral-500">No data available yet.</p>
          </Card>
        )}
        {loading && (
          <Card>
            <p className="text-sm text-neutral-500">Loading metrics…</p>
          </Card>
        )}
      </div>
    </div>
  );
}
