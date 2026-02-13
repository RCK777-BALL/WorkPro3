import React, { useState } from 'react';

interface WorkOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: { title: string; priority: string }) => void;
}

const WorkOrderModal: React.FC<WorkOrderModalProps> = ({ isOpen, onClose, onSave }) => {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-neutral-900">New Work Order</h2>
        <div className="mt-4 space-y-3">
          <input
            className="w-full rounded border border-neutral-300 p-2 text-sm"
            placeholder="Work order title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <select
            className="w-full rounded border border-neutral-300 p-2 text-sm"
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button className="rounded border border-neutral-300 px-4 py-2 text-sm" onClick={onClose}>
            Cancel
          </button>
          <button
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white"
            onClick={() => onSave({ title, priority })}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkOrderModal;
