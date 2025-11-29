/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useState } from 'react';
import Button from '@/components/common/Button';
import Modal from '@/components/modals/Modal';
import type { Vendor } from '@/types';

interface VendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendor: Vendor | null;
  onSave: (data: { name: string; email?: string; phone?: string }) => void;
}

const VendorModal = ({ isOpen, onClose, vendor, onSave }: VendorModalProps) => {
  const [form, setForm] = useState({ name: '', email: '', phone: '' });

  useEffect(() => {
    if (vendor) {
      setForm({ name: vendor.name, email: vendor.email || '', phone: vendor.phone || '' });
    } else {
      setForm({ name: '', email: '', phone: '' });
    }
  }, [vendor, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={vendor ? 'Edit Vendor' : 'Add Vendor'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1" htmlFor="vendor-name">
            Name
          </label>
          <input
            id="vendor-name"
            type="text"
            className="w-full px-3 py-2 border border-neutral-300 rounded-md"
            value={form.name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1" htmlFor="vendor-email">
            Email
          </label>
          <input
            id="vendor-email"
            type="email"
            className="w-full px-3 py-2 border border-neutral-300 rounded-md"
            value={form.email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1" htmlFor="vendor-phone">
            Phone
          </label>
          <input
            id="vendor-phone"
            type="tel"
            className="w-full px-3 py-2 border border-neutral-300 rounded-md"
            value={form.phone}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
        <div className="flex justify-end space-x-2 pt-4 border-t border-neutral-200">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            {vendor ? 'Save Changes' : 'Add Vendor'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default VendorModal;
