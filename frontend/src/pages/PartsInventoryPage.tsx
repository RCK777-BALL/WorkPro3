import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import DataTable from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';
import { api } from '@/lib/api';

interface InventoryRecord {
  id: string;
  item: string;
  category: string;
  onHand: number;
  reorderPoint: number;
  status: string;
}

const fallbackInventory: InventoryRecord[] = [
  {
    id: 'part-001',
    item: 'Hydraulic Hose 1in',
    category: 'Hydraulics',
    onHand: 18,
    reorderPoint: 10,
    status: 'Open',
  },
  {
    id: 'part-002',
    item: 'Bearing 6203-ZZ',
    category: 'Mechanical',
    onHand: 6,
    reorderPoint: 12,
    status: 'On Hold',
  },
  {
    id: 'part-003',
    item: 'Filter Cartridge 5μm',
    category: 'Consumables',
    onHand: 42,
    reorderPoint: 20,
    status: 'Completed',
  },
];

const parseInventory = (payload: unknown): InventoryRecord[] => {
  if (Array.isArray(payload)) {
    return payload as InventoryRecord[];
  }
  if (payload && typeof payload === 'object') {
    const source = (payload as { data?: unknown; items?: unknown; records?: unknown }).data ??
      (payload as { data?: unknown; items?: unknown; records?: unknown }).items ??
      (payload as { data?: unknown; items?: unknown; records?: unknown }).records;
    if (Array.isArray(source)) {
      return source as InventoryRecord[];
    }
  }
  return [];
};

export default function PartsInventoryPage() {
  const [inventory, setInventory] = useState<InventoryRecord[]>(fallbackInventory);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    api
      .get('/inventory/summary')
      .then((response) => {
        if (!active) return;
        const nextInventory = parseInventory(response.data);
        if (nextInventory.length) {
          setInventory(nextInventory);
        }
      })
      .catch(() => {
        toast.error('Failed to load inventory overview');
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
        <h1 className="text-2xl font-semibold mb-2">Parts &amp; Inventory</h1>
        <p className="text-sm text-slate-300">
          Manage critical spares, stock levels, and reorder thresholds for uninterrupted operations.
        </p>
      </div>

      <DataTable
        keyField="id"
        data={inventory}
        isLoading={isLoading}
        columns={[
          { header: 'Item', accessor: 'item' },
          { header: 'Category', accessor: 'category' },
          { header: 'On Hand', accessor: 'onHand' },
          { header: 'Reorder Point', accessor: 'reorderPoint' },
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
