/*
 * SPDX-License-Identifier: MIT
 */

import { useMemo, useState } from 'react';
import { Upload } from 'lucide-react';
import clsx from 'clsx';

import { useAssetMetersQuery, type AssetMeter } from '@/api/assets';
import SimpleLineChart from '@/components/charts/SimpleLineChart';

type AssetMetersPanelProps = {
  assetId: string;
};

const parseCsv = (text: string): { name?: string; value?: number; timestamp?: string }[] => {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, value, timestamp] = line.split(',');
      return { name: name?.trim(), value: Number(value), timestamp: timestamp?.trim() };
    })
    .filter((row) => row.name && Number.isFinite(row.value));
};

const MeterCard = ({ meter }: { meter: AssetMeter }) => {
  const trend = useMemo(
    () =>
      meter.trend?.map((point) => ({
        label: new Date(point.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        value: point.value,
      })) ?? [],
    [meter.trend],
  );

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase text-neutral-500">{meter.unit}</p>
          <p className="text-lg font-semibold text-white">{meter.name}</p>
          <p className="text-xs text-neutral-400">PM Interval: {meter.pmInterval.toLocaleString()}</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase text-neutral-500">Current</p>
          <p className="text-2xl font-bold text-indigo-100">{meter.currentValue}</p>
          {meter.thresholds ? (
            <p className="text-[11px] text-neutral-400">
              Warning {meter.thresholds.warning ?? '—'} / Critical {meter.thresholds.critical ?? '—'}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-3 h-40">
        <SimpleLineChart data={trend} showDots grid={false} />
      </div>
    </div>
  );
};

const AssetMetersPanel = ({ assetId }: AssetMetersPanelProps) => {
  const { data, isLoading } = useAssetMetersQuery(assetId);
  const [csvPreview, setCsvPreview] = useState<{ name?: string; value?: number; timestamp?: string }[]>([]);

  const onCsvUpload = async (file: File) => {
    const text = await file.text();
    setCsvPreview(parseCsv(text));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-neutral-800 bg-neutral-950/70 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-white">Import meter readings</p>
          <p className="text-xs text-neutral-400">Upload CSV or stream via API to update meter trends.</p>
        </div>
        <label className={clsx('inline-flex cursor-pointer items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow')}>\
          <Upload size={16} />
          Upload CSV
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void onCsvUpload(file);
            }}
          />
        </label>
      </div>

      {csvPreview.length > 0 && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
          <p className="text-sm font-semibold text-white">CSV preview</p>
          <p className="text-xs text-neutral-400">{csvPreview.length} readings detected</p>
          <div className="mt-3 grid gap-2 text-xs text-neutral-200 md:grid-cols-3">
            {csvPreview.slice(0, 6).map((row, idx) => (
              <div key={`${row.name}-${idx}`} className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-2">
                <p className="font-semibold">{row.name}</p>
                <p className="text-neutral-300">{row.value}</p>
                <p className="text-[10px] text-neutral-500">{row.timestamp ?? 'Now'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {isLoading && <p className="text-sm text-neutral-500">Loading meters…</p>}
        {!isLoading && data?.length === 0 && <p className="text-sm text-neutral-500">No meters configured.</p>}
        {data?.map((meter) => (
          <MeterCard key={meter.id} meter={meter} />
        ))}
      </div>
    </div>
  );
};

export default AssetMetersPanel;
