import React, { useState } from 'react';
import { X } from 'lucide-react';
import Button from '@/common/Button';
import type { Station, Line } from '@/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  station: Station | null;
  lines: Line[];
  onUpdate: (station: Station) => void;
}

const StationModal: React.FC<Props> = ({ isOpen, onClose, station, lines, onUpdate }) => {
  const [formData, setFormData] = useState<Station>(
    station || { id: '', name: '', line: lines[0]?.id || '' }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-neutral-200">
          <h2 className="text-lg font-semibold text-neutral-900">
            {station ? 'Edit Station' : 'Create Station'}
          </h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-700">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-900 mb-1">Name</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-neutral-300 rounded-md text-neutral-900 bg-white"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-900 mb-1">Line</label>
            <select
              className="w-full px-3 py-2 border border-neutral-300 rounded-md text-neutral-900 bg-white"
              value={formData.line}
              onChange={(e) => setFormData({ ...formData, line: e.target.value })}
            >
              {lines.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-200">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {station ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StationModal;
