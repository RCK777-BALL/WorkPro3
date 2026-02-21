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
          <h1 className="text-2xl font-semibold text-[var(--wp-color-text)]">Vendors</h1>
          <p className="text-sm text-[var(--wp-color-text-muted)]">Manage vendor contacts and purchasing terms.</p>
        </div>
        <button className="rounded bg-[var(--wp-color-primary)] px-4 py-2 text-sm text-[var(--wp-color-text)]" onClick={() => setIsOpen(true)}>
          Add vendor
        </button>
      </header>

      <div className="rounded-lg border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] p-4">
        {vendors.length === 0 ? (
          <p className="text-sm text-[var(--wp-color-text-muted)]">No vendors yet.</p>
        ) : (
          <ul className="space-y-2 text-sm text-[var(--wp-color-text)]">
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

