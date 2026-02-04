import React, { useState } from 'react';

interface VendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: { name: string; email?: string }) => void;
}

const VendorModal: React.FC<VendorModalProps> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-neutral-900">New Vendor</h2>
        <div className="mt-4 space-y-3">
          <input
            className="w-full rounded border border-neutral-300 p-2 text-sm"
            placeholder="Vendor name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <input
            className="w-full rounded border border-neutral-300 p-2 text-sm"
            placeholder="Contact email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button className="rounded border border-neutral-300 px-4 py-2 text-sm" onClick={onClose}>
            Cancel
          </button>
          <button
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white"
            onClick={() => onSave({ name, email: email || undefined })}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default VendorModal;
