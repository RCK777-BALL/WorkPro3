/*
 * SPDX-License-Identifier: MIT
 */

import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';

import Button from '@/components/common/Button';
import DataTable from '@/components/common/DataTable';
import TableLayoutControls from '@/components/common/TableLayoutControls';
import { useDeleteVendor, useVendors } from '@/hooks/useVendors';
import type { Vendor } from '@/types/vendor';
import { useTableLayout } from '@/hooks/useTableLayout';
import { useAuth } from '@/context/AuthContext';
import Badge from '@/components/common/Badge';
import StatCard from '@/components/common/StatCard';
import Input from '@/components/common/Input';

const VendorList = () => {
  const { user } = useAuth();
  const { data, isLoading } = useVendors();
  const vendors = data ?? [];
  const deleteVendor = useDeleteVendor();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');

  const filteredVendors = useMemo(() => {
    const term = search.trim().toLowerCase();
    return vendors.filter((vendor) => {
      const matchesStatus = status === 'all' || vendor.status === status;
      const matchesTerm = !term
        ? true
        : [vendor.name, vendor.email, vendor.phone]
            .filter(Boolean)
            .some((value) => value?.toLowerCase().includes(term));
      return matchesStatus && matchesTerm;
    });
  }, [search, status, vendors]);

  const columns = useMemo(
    () => [
      { id: 'name', header: 'Name', accessor: 'name' as const },
      {
        id: 'email',
        header: 'Email',
        accessor: (vendor: Vendor) => vendor.email ?? '—',
      },
      {
        id: 'phone',
        header: 'Phone',
        accessor: (vendor: Vendor) => vendor.phone ?? '—',
      },
      {
        id: 'status',
        header: 'Status',
        accessor: (vendor: Vendor) => (
          <Badge text={vendor.status ?? 'active'} type={vendor.status === 'inactive' ? 'default' : 'success'} />
        ),
      },
      {
        id: 'spend',
        header: 'Spend to date',
        accessor: (vendor: Vendor) => (vendor.spendToDate ? `$${vendor.spendToDate.toLocaleString()}` : '—'),
      },
      {
        id: 'actions',
        header: 'Actions',
        accessor: (vendor: Vendor) => (
          <div className="flex gap-2">
            <Button as={Link} to={`/vendors/${vendor.id}`} variant="outline" size="sm">
              View
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={deleteVendor.isLoading}
              onClick={() => deleteVendor.mutate(vendor.id)}
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [deleteVendor],
  );

  const columnOptions = useMemo(
    () => columns.map((column) => ({ id: column.id ?? column.header, label: column.header })),
    [columns],
  );

  const tableLayout = useTableLayout({
    tableKey: 'vendor-list',
    columnIds: columnOptions.map((column) => column.id),
    userId: user?.id,
  });

  const columnLookup = useMemo(
    () => new Map(columns.map((column) => [column.id ?? column.header, column])),
    [columns],
  );

  const visibleColumns = useMemo(
    () =>
      tableLayout.visibleColumnOrder
        .map((id) => columnLookup.get(id))
        .filter(Boolean) as typeof columns,
    [columnLookup, tableLayout.visibleColumnOrder],
  );

  const handleSaveLayout = (name: string) => tableLayout.saveLayout(name, {});

  const handleApplyLayout = (layoutId: string) => {
    tableLayout.applyLayout(layoutId);
  };

  const shareLayoutLink = (layoutId?: string) => {
    const targetState = layoutId
      ? tableLayout.savedLayouts.find((layout) => layout.id === layoutId)?.state
      : tableLayout.preferences;
    return tableLayout.getShareableLink(targetState ?? tableLayout.preferences);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Vendors</h1>
          <p className="text-sm text-neutral-500">Manage supplier contact details for purchasing workflows.</p>
        </div>
        <Button as={Link} to="/vendors/new" variant="primary">
          Add vendor
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          title="Total vendors"
          value={vendors.length.toLocaleString()}
          description="Active and inactive"
        />
        <StatCard
          title="Active vendors"
          value={vendors.filter((vendor) => vendor.status !== 'inactive').length.toLocaleString()}
          description="Available to order"
        />
        <StatCard
          title="Spend to date"
          value={`$${(
            vendors.reduce((sum, vendor) => sum + (vendor.spendToDate ?? 0), 0) || 0
          ).toLocaleString()}`}
          description="Across all sites"
        />
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-1 gap-3">
            <Input
              label="Search"
              placeholder="Search vendors"
              value={search}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)}
            />
            <div className="w-40">
              <label className="block text-xs font-medium text-neutral-600">Status</label>
              <select
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                value={status}
                onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
                  setStatus(event.target.value as typeof status)
                }
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        <TableLayoutControls
          columns={columnOptions}
          columnOrder={tableLayout.columnOrder}
          hiddenColumns={tableLayout.hiddenColumns}
          onToggleColumn={tableLayout.toggleColumn}
          onMoveColumn={tableLayout.moveColumn}
          onReset={tableLayout.resetLayout}
          onSaveLayout={handleSaveLayout}
          savedLayouts={tableLayout.savedLayouts}
          onApplyLayout={handleApplyLayout}
          onShareLayout={shareLayoutLink}
          activeLayoutId={tableLayout.activeLayoutId}
        />

        <DataTable<Vendor>
          columns={visibleColumns}
          data={filteredVendors}
          keyField="id"
          isLoading={isLoading}
          emptyMessage="No vendors match the current filters."
          sortState={tableLayout.sort ?? undefined}
          onSortChange={(state) => tableLayout.setSort(state ?? null)}
        />
      </div>
    </div>
  );
};

export default VendorList;
