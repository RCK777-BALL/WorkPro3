import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import DataTable from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';
import { api } from '@/lib/api';

interface MeterRecord {
  id: string;
  meter: string;
  asset: string;
  lastReading: number;
  readingDate: string;
  status: string;
}

const fallbackMeters: MeterRecord[] = [
  {
    id: 'meter-001',
    meter: 'Runtime Hours',
    asset: 'Boiler #2',
    lastReading: 11820,
    readingDate: '2024-06-01',
    status: 'Open',
  },
  {
    id: 'meter-002',
    meter: 'Cycle Count',
    asset: 'Press Line C',
    lastReading: 870,
    readingDate: '2024-06-05',
    status: 'In Progress',
  },
  {
    id: 'meter-003',
    meter: 'Differential Pressure',
    asset: 'Filter Bank A',
    lastReading: 5.6,
    readingDate: '2024-06-03',
    status: 'Completed',
  },
];

const parseMeters = (payload: unknown): MeterRecord[] => {
  if (Array.isArray(payload)) {
    return payload as MeterRecord[];
  }
  if (payload && typeof payload === 'object') {
    const source = (payload as { data?: unknown; items?: unknown; records?: unknown }).data ??
      (payload as { data?: unknown; items?: unknown; records?: unknown }).items ??
      (payload as { data?: unknown; items?: unknown; records?: unknown }).records;
    if (Array.isArray(source)) {
      return source as MeterRecord[];
    }
  }
  return [];
};

export default function MetersReadingsPage() {
  const [meters, setMeters] = useState<MeterRecord[]>(fallbackMeters);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    api
      .get('/meters/summary')
      .then((response) => {
        if (!active) return;
        const nextMeters = parseMeters(response.data);
        if (nextMeters.length) {
          setMeters(nextMeters);
        }
      })
      .catch(() => {
        toast.error('Failed to load meter readings');
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="p-6 text-gray-200 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold mb-2">Meters / Readings</h1>
        <p className="text-sm text-slate-300">
          Capture runtime, condition, and compliance readings to trigger proactive actions.
        </p>
      </div>

      <DataTable
        keyField="id"
        data={meters}
        isLoading={isLoading}
        columns={[
          { header: 'Meter', accessor: 'meter' },
          { header: 'Asset', accessor: 'asset' },
          { header: 'Last Reading', accessor: 'lastReading' },
          { header: 'Reading Date', accessor: 'readingDate' },
          {
            header: 'Status',
            accessor: (record) => <StatusBadge status={record.status} size="sm" />,
          },
        ]}
        className="rounded-xl border border-slate-800 bg-slate-900/60"
      />
    </div>
  );
}
