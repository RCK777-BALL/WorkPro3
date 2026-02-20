/*
 * SPDX-License-Identifier: MIT
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import DataTable from '@/components/common/DataTable';
import Input from '@/components/common/Input';
import { useDeleteVendor, useVendors } from '@/hooks/useVendors';
import type { Vendor } from '@/types/vendor';

const VendorsPage = () => {
  const { data: vendors = [], isLoading, error } = useVendors();
  const deleteVendor = useDeleteVendor();
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const hasError = Boolean(error);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return vendors;
    return vendors.filter((vendor) =>
      [vendor.name, vendor.email, vendor.phone].filter(Boolean).some((value) => value?.toLowerCase().includes(term)),
    );
  }, [vendors, search]);

  const handleDelete = async (vendor: Vendor) => {
    if (deleteVendor.isPending) return;
    const confirmed = window.confirm(`Delete vendor ${vendor.name}? This cannot be undone.`);
    if (!confirmed) return;
    setDeletingId(vendor.id);
    try {
      await deleteVendor.mutateAsync(vendor.id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--wp-color-text)]">Vendors</h1>
          <p className="text-sm text-[var(--wp-color-text-muted)]">Manage preferred suppliers and keep contact details current.</p>
        </div>
        <Button as={Link} to="/vendors/new" variant="primary">
          Add vendor
        </Button>
      </div>

      <Card title="Filters" className="space-y-3">
        <Input
          label="Search"
          placeholder="Search by name, email, or phone"
          value={search}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)}
        />
      </Card>

      <Card title="Vendor list" className="space-y-3">
        {hasError && <p className="text-sm text-error-600">Unable to load vendors.</p>}
        <DataTable<Vendor>
          keyField="id"
          data={filtered}
          isLoading={isLoading}
          emptyMessage="No vendors found."
          columns={[
            { id: 'name', header: 'Vendor', accessor: (vendor) => vendor.name },
            { id: 'email', header: 'Email', accessor: (vendor) => vendor.email ?? '—' },
            { id: 'phone', header: 'Phone', accessor: (vendor) => vendor.phone ?? '—' },
            { id: 'status', header: 'Status', accessor: (vendor) => vendor.status ?? 'active' },
            {
              id: 'actions',
              header: 'Actions',
              accessor: (vendor) => (
                <div className="flex flex-wrap gap-2">
                  <Button as={Link} to={`/vendors/${vendor.id}`} size="sm" variant="outline">
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(vendor)}
                    disabled={deleteVendor.isPending && deletingId === vendor.id}
                  >
                    Delete
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default VendorsPage;


