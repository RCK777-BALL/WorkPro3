/*
 * SPDX-License-Identifier: MIT
 */

import { Building2 } from 'lucide-react';

import { useVendorsQuery } from './hooks';

const VendorListPanel = () => {
  const { data, isLoading, error } = useVendorsQuery();
  const vendors = data ?? [];
  const hasError = Boolean(error);

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
        <Building2 size={18} className="text-neutral-500" />
        <div>
          <p className="text-sm font-semibold text-neutral-900">Preferred vendors</p>
          <p className="text-xs text-neutral-500">Contact and lead time details.</p>
        </div>
      </div>
      {isLoading && <p className="py-4 text-sm text-neutral-500">Loading vendor directory…</p>}
      {hasError && <p className="py-4 text-sm text-error-600">Unable to load vendors.</p>}
      {!isLoading && !hasError && vendors.length === 0 && (
        <p className="py-4 text-sm text-neutral-500">No vendors added yet.</p>
      )}
      {!isLoading && !hasError && vendors.length > 0 && (
        <ul className="divide-y divide-neutral-100">
          {vendors.map((vendor) => (
            <li key={vendor.id} className="py-3 text-sm">
              <p className="font-medium text-neutral-900">{vendor.name}</p>
              {vendor.contact && <p className="text-xs text-neutral-500">Contact: {vendor.contact}</p>}
              {(vendor.email || vendor.phone) && (
                <p className="text-xs text-neutral-500">
                  {vendor.email && <span className="mr-2">{vendor.email}</span>}
                  {vendor.phone && <span>{vendor.phone}</span>}
                </p>
              )}
              {vendor.leadTimeDays && (
                <p className="text-xs text-neutral-500">Lead time ~{vendor.leadTimeDays} day(s)</p>
              )}
              {vendor.preferredSkus && vendor.preferredSkus.length > 0 && (
                <p className="text-xs text-neutral-500">
                  Prefers: {vendor.preferredSkus.slice(0, 3).join(', ')}
                  {vendor.preferredSkus.length > 3 && '…'}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default VendorListPanel;
