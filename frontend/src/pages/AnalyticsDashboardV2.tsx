/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';

import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import Input from '@/components/common/Input';
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

const EMPTY_SNAPSHOT: Snapshot = {
  mtbfHours: 0,
  mttrHours: 0,
  downtimeHours: 0,
  pmCompliance: 0,
  workOrderVolume: 0,
  costPerAsset: 0,
};

export default function AnalyticsDashboardV2() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [draftSnapshot, setDraftSnapshot] = useState<Snapshot | null>(null);
  const [isEditing, setIsEditing] = useState(false);

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

  const startEditing = (existing?: Snapshot | null) => {
    setDraftSnapshot(existing ?? EMPTY_SNAPSHOT);
    setIsEditing(true);
  };

  const handleEditSnapshot = () => startEditing(snapshot);
  const handleAddSnapshot = () => startEditing(snapshot ?? EMPTY_SNAPSHOT);

  const handleDraftChange = (key: keyof Snapshot, value: number) => {
    setDraftSnapshot((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSaveSnapshot = () => {
    if (!draftSnapshot) return;
    setSnapshot(draftSnapshot);
    setDraftSnapshot(null);
    setIsEditing(false);
  };

  const handleDeleteSnapshot = () => {
    setSnapshot(null);
    setDraftSnapshot(null);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setDraftSnapshot(null);
    setIsEditing(false);
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
        <div className="flex flex-wrap gap-3">
          <Button
            variant="primary"
            onClick={handleAddSnapshot}
            icon={<Plus className="h-4 w-4" />}
            iconPosition="left"
          >
            Add snapshot
          </Button>
          <Button
            variant="secondary"
            onClick={handleEditSnapshot}
            disabled={!snapshot}
            icon={<Pencil className="h-4 w-4" />}
            iconPosition="left"
          >
            Edit snapshot
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteSnapshot}
            disabled={!snapshot}
            icon={<Trash2 className="h-4 w-4" />}
            iconPosition="left"
          >
            Delete snapshot
          </Button>
          <Button onClick={handleExport} loading={exporting} variant="outline">
            Export CSV
          </Button>
        </div>
      </header>

      {isEditing && draftSnapshot ? (
        <Card className="space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">Snapshot editor</p>
              <h2 className="text-lg font-semibold text-neutral-900">Update snapshot metrics</h2>
              <p className="text-sm text-neutral-500">
                Adjust KPI values, then save to refresh the snapshot view.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button onClick={handleSaveSnapshot}>Save snapshot</Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Input
              label="MTBF (hrs)"
              type="number"
              value={draftSnapshot.mtbfHours}
              onChange={(event) => handleDraftChange('mtbfHours', Number(event.target.value))}
            />
            <Input
              label="MTTR (hrs)"
              type="number"
              value={draftSnapshot.mttrHours}
              onChange={(event) => handleDraftChange('mttrHours', Number(event.target.value))}
            />
            <Input
              label="Downtime (hrs)"
              type="number"
              value={draftSnapshot.downtimeHours}
              onChange={(event) => handleDraftChange('downtimeHours', Number(event.target.value))}
            />
            <Input
              label="PM Compliance (%)"
              type="number"
              value={draftSnapshot.pmCompliance}
              onChange={(event) => handleDraftChange('pmCompliance', Number(event.target.value))}
            />
            <Input
              label="WO Volume"
              type="number"
              value={draftSnapshot.workOrderVolume}
              onChange={(event) => handleDraftChange('workOrderVolume', Number(event.target.value))}
            />
            <Input
              label="Cost / Asset"
              type="number"
              value={draftSnapshot.costPerAsset}
              onChange={(event) => handleDraftChange('costPerAsset', Number(event.target.value))}
            />
          </div>
        </Card>
      ) : null}

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
