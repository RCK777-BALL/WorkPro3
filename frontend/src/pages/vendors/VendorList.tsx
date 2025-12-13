/*
 * SPDX-License-Identifier: MIT
 */

import { Link } from 'react-router-dom';
import { useMemo } from 'react';

import Button from '@/components/common/Button';
import DataTable from '@/components/common/DataTable';
import TableLayoutControls from '@/components/common/TableLayoutControls';
import { useDeleteVendor, useVendors } from '@/hooks/useVendors';
import type { Vendor } from '@/types/vendor';
import { useTableLayout } from '@/hooks/useTableLayout';
import { useAuth } from '@/context/AuthContext';

const VendorList = () => {
  const { user } = useAuth();
  const { data, isLoading } = useVendors();
  const vendors = data ?? [];
  const deleteVendor = useDeleteVendor();

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
        id: 'actions',
        header: 'Actions',
        accessor: (vendor: Vendor) => (
          <div className="flex gap-2">
            <Button as={Link} to={`/vendors/${vendor.id}`} variant="outline" size="sm">
              Edit
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Vendors</h1>
          <p className="text-sm text-neutral-500">Manage supplier contact details for purchasing workflows.</p>
        </div>
        <Button as={Link} to="/vendors/new" variant="primary">
          Add vendor
        </Button>
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
        data={vendors}
        keyField="id"
        isLoading={isLoading}
        emptyMessage="No vendors have been added yet."
        sortState={tableLayout.sort ?? undefined}
        onSortChange={(state) => tableLayout.setSort(state ?? null)}
      />
    </div>
  );
};

export default VendorList;
