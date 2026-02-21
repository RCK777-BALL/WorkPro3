import React, { useState } from 'react';

interface POModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: { vendor: string; notes?: string }) => void;
}

const POModal: React.FC<POModalProps> = ({ isOpen, onClose, onSave }) => {
  const [vendor, setVendor] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-neutral-900">New Purchase Order</h2>
        <div className="mt-4 space-y-3">
          <input
            className="w-full rounded border border-neutral-300 p-2 text-sm"
            placeholder="Vendor name"
            value={vendor}
            onChange={(event) => setVendor(event.target.value)}
          />
          <textarea
            className="w-full rounded border border-neutral-300 p-2 text-sm"
            placeholder="Notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button className="rounded border border-neutral-300 px-4 py-2 text-sm" onClick={onClose}>
            Cancel
          </button>
          <button
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white"
            onClick={() => onSave({ vendor, notes: notes || undefined })}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default POModal;
