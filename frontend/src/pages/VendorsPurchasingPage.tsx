import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import DataTable from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';
import { api } from '@/lib/api';

interface VendorRecord {
  id: string;
  vendor: string;
  category: string;
  spendYtd: number;
  nextReview: string;
  status: string;
}

const fallbackVendors: VendorRecord[] = [
  {
    id: 'vendor-001',
    vendor: 'ProParts Supply',
    category: 'MRO',
    spendYtd: 18500,
    nextReview: '2024-07-30',
    status: 'Open',
  },
  {
    id: 'vendor-002',
    vendor: 'Northwind Safety',
    category: 'PPE',
    spendYtd: 8200,
    nextReview: '2024-09-12',
    status: 'In Progress',
  },
  {
    id: 'vendor-003',
    vendor: 'Metro Automation',
    category: 'Controls',
    spendYtd: 23200,
    nextReview: '2024-08-04',
    status: 'Completed',
  },
];

const parseVendors = (payload: unknown): VendorRecord[] => {
  if (Array.isArray(payload)) {
    return payload as VendorRecord[];
  }
  if (payload && typeof payload === 'object') {
    const source = (payload as { data?: unknown; items?: unknown; records?: unknown }).data ??
      (payload as { data?: unknown; items?: unknown; records?: unknown }).items ??
      (payload as { data?: unknown; items?: unknown; records?: unknown }).records;
    if (Array.isArray(source)) {
      return source as VendorRecord[];
    }
  }
  return [];
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export default function VendorsPurchasingPage() {
  const [vendors, setVendors] = useState<VendorRecord[]>(fallbackVendors);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    api
      .get('/vendors/summary')
      .then((response) => {
        if (!active) return;
        const nextVendors = parseVendors(response.data);
        if (nextVendors.length) {
          setVendors(nextVendors);
        }
      })
      .catch(() => {
        toast.error('Failed to load vendor performance data');
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
        <h1 className="text-2xl font-semibold mb-2">Vendors &amp; Purchasing</h1>
        <p className="text-sm text-slate-300">
          Track supplier relationships, contracts, and spend to keep purchasing aligned.
        </p>
      </div>

      <DataTable
        keyField="id"
        data={vendors}
        isLoading={isLoading}
        columns={[
          { header: 'Vendor', accessor: 'vendor' },
          { header: 'Category', accessor: 'category' },
          {
            header: 'Spend YTD',
            accessor: (record) => currencyFormatter.format(record.spendYtd),
          },
          { header: 'Next Review', accessor: 'nextReview' },
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
