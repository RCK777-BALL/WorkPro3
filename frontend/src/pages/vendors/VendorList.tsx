/*
 * SPDX-License-Identifier: MIT
 */

import { Link } from 'react-router-dom';

import Button from '@/components/common/Button';
import DataTable from '@/components/common/DataTable';
import { useDeleteVendor, useVendors } from '@/hooks/useVendors';
import type { Vendor } from '@/types/vendor';

const VendorList = () => {
  const { data, isLoading } = useVendors();
  const vendors = data ?? [];
  const deleteVendor = useDeleteVendor();

  const columns = [
    { header: 'Name', accessor: 'name' as const },
    {
      header: 'Email',
      accessor: (vendor: Vendor) => vendor.email ?? '—',
    },
    {
      header: 'Phone',
      accessor: (vendor: Vendor) => vendor.phone ?? '—',
    },
    {
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
  ];

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

      <DataTable<Vendor>
        columns={columns}
        data={vendors}
        keyField="id"
        isLoading={isLoading}
        emptyMessage="No vendors have been added yet."
      />
    </div>
  );
};

export default VendorList;
