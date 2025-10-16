import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import DataTable from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';
import { api } from '@/lib/api';

interface AssetRecord {
  id: string;
  name: string;
  location: string;
  category: string;
  status: string;
}

const fallbackAssets: AssetRecord[] = [
  {
    id: 'asset-001',
    name: 'Main Air Compressor',
    location: 'Plant 1 - Utility Room',
    category: 'Utilities',
    status: 'Open',
  },
  {
    id: 'asset-002',
    name: 'Packaging Line',
    location: 'Plant 1 - Line B',
    category: 'Production',
    status: 'In Progress',
  },
  {
    id: 'asset-003',
    name: 'Warehouse Lift 3',
    location: 'Distribution Center',
    category: 'Material Handling',
    status: 'Completed',
  },
];

const parseAssets = (payload: unknown): AssetRecord[] => {
  if (Array.isArray(payload)) {
    return payload as AssetRecord[];
  }
  if (payload && typeof payload === 'object') {
    const source = (payload as { data?: unknown; items?: unknown; records?: unknown }).data ??
      (payload as { data?: unknown; items?: unknown; records?: unknown }).items ??
      (payload as { data?: unknown; items?: unknown; records?: unknown }).records;
    if (Array.isArray(source)) {
      return source as AssetRecord[];
    }
  }
  return [];
};

export default function AssetsLocationsPage() {
  const [assets, setAssets] = useState<AssetRecord[]>(fallbackAssets);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    api
      .get('/assets/summary')
      .then((response) => {
        if (!active) return;
        const nextAssets = parseAssets(response.data);
        if (nextAssets.length) {
          setAssets(nextAssets);
        }
      })
      .catch(() => {
        toast.error('Failed to load asset hierarchy');
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
        <h1 className="text-2xl font-semibold mb-2">Assets & Locations</h1>
        <p className="text-sm text-slate-300">
          Visualize critical equipment, locations, and their operational readiness.
        </p>
      </div>

      <DataTable
        keyField="id"
        data={assets}
        isLoading={isLoading}
        columns={[
          { header: 'Asset', accessor: 'name' },
          { header: 'Location', accessor: 'location' },
          { header: 'Category', accessor: 'category' },
          {
            header: 'Status',
            accessor: (asset) => <StatusBadge status={asset.status} size="sm" />,
          },
        ]}
        className="rounded-xl border border-slate-800 bg-slate-900/60"
      />
    </div>
  );
}
