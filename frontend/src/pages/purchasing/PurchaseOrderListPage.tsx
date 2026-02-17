/*
 * SPDX-License-Identifier: MIT
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import DataTable from '@/components/common/DataTable';
import Input from '@/components/common/Input';
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders';
import { useVendors } from '@/hooks/useVendors';
import type { PurchaseOrder } from '@/api/purchasing';
import { formatDate } from '@/utils/date';

const statusOrder: PurchaseOrder['status'][] = [
  'draft',
  'sent',
  'partially_received',
  'received',
  'closed',
  'canceled',
];

const statusLabels: Record<PurchaseOrder['status'], string> = {
  draft: 'Draft',
  sent: 'Sent',
  partially_received: 'Partially received',
  received: 'Received',
  closed: 'Closed',
  canceled: 'Canceled',
};

const statusVariant: Record<PurchaseOrder['status'], 'info' | 'success' | 'warning' | 'default'> = {
  draft: 'default',
  sent: 'info',
  partially_received: 'warning',
  received: 'success',
  closed: 'default',
  canceled: 'warning',
};

const PurchaseOrderListPage = () => {
  const { data: orders, isLoading } = usePurchaseOrders();
  const { data: vendors } = useVendors();
  const [status, setStatus] = useState<'all' | PurchaseOrder['status']>('all');
  const [search, setSearch] = useState('');

  const vendorLookup = useMemo(() => new Map((vendors ?? []).map((vendor) => [vendor.id, vendor.name])), [vendors]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (orders ?? []).filter((po) => {
      const matchesStatus = status === 'all' || po.status === status;
      const matchesTerm = !term
        ? true
        : [po.poNumber, vendorLookup.get(po.vendorId ?? ''), po.vendor?.name]
            .filter(Boolean)
            .some((value) => value?.toLowerCase().includes(term));
      return matchesStatus && matchesTerm;
    });
  }, [orders, search, status, vendorLookup]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--wp-color-text)]">Purchase Orders</h1>
          <p className="text-sm text-[var(--wp-color-text-muted)]">Track ordering lifecycle from draft through receipt.</p>
        </div>
        <Button as={Link} to="/purchasing/purchase-orders/new" variant="primary">
          New purchase order
        </Button>
      </div>

      <Card className="space-y-3" title="Filters">
        <div className="grid gap-3 md:grid-cols-3">
          <Input
            label="Search"
            placeholder="Search by PO # or vendor"
            value={search}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)}
          />
          <div>
            <label className="block text-sm font-medium text-[var(--wp-color-text)]">Status</label>
            <select
              className="mt-1 w-full rounded-md border border-[var(--wp-color-border)] px-3 py-2"
              value={status}
              onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
                setStatus(event.target.value as typeof status)
              }
            >
              <option value="all">All</option>
              {statusOrder.map((value) => (
                <option key={value} value={value}>
                  {statusLabels[value]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <Card title="Orders" className="space-y-3">
        <DataTable<PurchaseOrder>
          keyField="id"
          data={filtered}
          isLoading={isLoading}
          emptyMessage="No purchase orders found."
          columns={[
            { id: 'po', header: 'PO #', accessor: (po) => po.poNumber ?? po.id },
            {
              id: 'vendor',
              header: 'Vendor',
              accessor: (po) => vendorLookup.get(po.vendorId ?? '') ?? po.vendor?.name ?? '—',
            },
            {
              id: 'status',
              header: 'Status',
              accessor: (po) => <Badge text={statusLabels[po.status]} type={statusVariant[po.status]} />,
            },
            {
              id: 'expected',
              header: 'Expected',
              accessor: (po) => (po.expectedDate ? formatDate(po.expectedDate) : '—'),
            },
            { id: 'lines', header: 'Lines', accessor: (po) => po.lines?.length ?? 0 },
            {
              id: 'actions',
              header: 'Actions',
              accessor: (po) => (
                <Button as={Link} to={`/purchasing/purchase-orders/${po.id}`} size="sm" variant="outline">
                  View
                </Button>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default PurchaseOrderListPage;

