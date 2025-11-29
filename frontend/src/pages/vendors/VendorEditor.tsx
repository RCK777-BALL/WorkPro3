/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import Button from '@/components/common/Button';
import { useVendor, useSaveVendor } from '@/hooks/useVendors';
import type { Vendor } from '@/types/vendor';

const defaultVendor: Vendor = { id: '', name: '', email: '', phone: '' };

const VendorEditor = () => {
  const { vendorId } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(vendorId);
  const { data, isLoading } = useVendor(vendorId);
  const saveVendor = useSaveVendor();
  const [form, setForm] = useState<Vendor>(defaultVendor);

  useEffect(() => {
    if (data) {
      setForm({
        id: data.id,
        name: data.name,
        email: data.email ?? '',
        phone: data.phone ?? '',
      });
    } else {
      setForm(defaultVendor);
    }
  }, [data, vendorId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await saveVendor.mutateAsync({ ...form, id: vendorId });
    navigate('/vendors');
  };

  if (isEdit && isLoading) {
    return <p className="text-sm text-neutral-500">Loading vendor…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">{isEdit ? 'Edit vendor' : 'Add vendor'}</h1>
          <p className="text-sm text-neutral-500">Keep vendor contact information up to date for purchase orders.</p>
        </div>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium text-neutral-700" htmlFor="vendor-name">
            Name
          </label>
          <input
            id="vendor-name"
            name="name"
            type="text"
            className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2"
            required
            value={form.name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-neutral-700" htmlFor="vendor-email">
              Email
            </label>
            <input
              id="vendor-email"
              type="email"
              className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2"
              value={form.email ?? ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700" htmlFor="vendor-phone">
              Phone
            </label>
            <input
              id="vendor-phone"
              type="tel"
              className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2"
              value={form.phone ?? ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => navigate('/vendors')}>
            Cancel
          </Button>
          <Button type="submit" loading={saveVendor.isLoading}>
            {isEdit ? 'Save changes' : 'Create vendor'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default VendorEditor;
