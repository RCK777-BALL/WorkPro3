import React, { useState } from 'react';

interface PMModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: { title: string; cadenceDays: number; assetId: string }) => void;
}

const PMModal: React.FC<PMModalProps> = ({ isOpen, onClose, onSave }) => {
  const [title, setTitle] = useState('');
  const [cadenceDays, setCadenceDays] = useState(30);
  const [assetId, setAssetId] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-neutral-900">New PM Task</h2>
        <div className="mt-4 space-y-3">
          <input
            className="w-full rounded border border-neutral-300 p-2 text-sm"
            placeholder="PM task title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <input
            className="w-full rounded border border-neutral-300 p-2 text-sm"
            type="number"
            min={1}
            value={cadenceDays}
            onChange={(event) => setCadenceDays(Number(event.target.value))}
          />
          <input
            className="w-full rounded border border-neutral-300 p-2 text-sm"
            placeholder="Asset ID"
            value={assetId}
            onChange={(event) => setAssetId(event.target.value)}
          />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button className="rounded border border-neutral-300 px-4 py-2 text-sm" onClick={onClose}>
            Cancel
          </button>
          <button
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white"
            onClick={() => onSave({ title, cadenceDays, assetId })}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default PMModal;
