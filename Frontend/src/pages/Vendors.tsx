import React, { useState } from 'react';
import VendorModal from '../components/modals/VendorModal';

const Vendors: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [vendors, setVendors] = useState<Array<{ name: string; email?: string }>>([]);

  const handleSave = (payload: { name: string; email?: string }) => {
    setVendors((current) => [...current, payload]);
    setIsOpen(false);
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Vendors</h1>
          <p className="text-sm text-neutral-500">Manage vendor contacts and purchasing terms.</p>
        </div>
        <button className="rounded bg-blue-600 px-4 py-2 text-sm text-white" onClick={() => setIsOpen(true)}>
          Add vendor
        </button>
      </header>

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        {vendors.length === 0 ? (
          <p className="text-sm text-neutral-500">No vendors yet.</p>
        ) : (
          <ul className="space-y-2 text-sm text-neutral-700">
            {vendors.map((vendor) => (
              <li key={vendor.name}>{vendor.name}</li>
            ))}
          </ul>
        )}
      </div>

      <VendorModal isOpen={isOpen} onClose={() => setIsOpen(false)} onSave={handleSave} />
    </div>
  );
};

export default Vendors;
