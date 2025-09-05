import { useEffect, useState } from 'react';
import Button from '../common/Button';
import Modal from '../modals/Modal';
import type { Vendor } from '../../types';

interface VendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendor: Vendor | null;
  onSave: (data: { name: string; contact: string }) => void;
}

const VendorModal = ({ isOpen, onClose, vendor, onSave }: VendorModalProps) => {
  const [form, setForm] = useState({ name: '', contact: '' });

  useEffect(() => {
    if (vendor) {
      setForm({ name: vendor.name, contact: vendor.contact || '' });
    } else {
      setForm({ name: '', contact: '' });
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
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1" htmlFor="vendor-contact">
            Contact
          </label>
          <input
            id="vendor-contact"
            type="text"
            className="w-full px-3 py-2 border border-neutral-300 rounded-md"
            value={form.contact}
            onChange={(e) => setForm({ ...form, contact: e.target.value })}
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
