/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useState } from 'react';
import Button from '@common/Button';

import Modal from './Modal';

interface StationForm {
  name: string;
  notes: string;
}

interface StationModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  departmentName?: string;
  lineName?: string;
  initialData?: Partial<StationForm>;
  onSubmit: (form: StationForm) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
  onClose: () => void;
  loading?: boolean;
}

const emptyForm: StationForm = {
  name: '',
  notes: '',
};

const StationModal = ({
  isOpen,
  mode,
  departmentName,
  lineName,
  initialData,
  onSubmit,
  onDelete,
  onClose,
  loading = false,
}: StationModalProps) => {
  const [form, setForm] = useState<StationForm>(emptyForm);

  useEffect(() => {
    if (isOpen) {
      setForm({
        name: initialData?.name ?? '',
        notes: initialData?.notes ?? '',
      });
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    await onSubmit({
      name: form.name.trim(),
      notes: form.notes.trim(),
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Add Station' : 'Edit Station'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {(departmentName || lineName) && (
          <div className="rounded-md bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600">
            {departmentName && <span>Department: {departmentName}</span>}
            {departmentName && lineName && <span className="mx-2">•</span>}
            {lineName && <span>Line: {lineName}</span>}
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
          <input
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            required
            placeholder="Station 100"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
          <textarea
            className="h-24 w-full resize-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
            value={form.notes}
            onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            placeholder="Optional notes about this station"
          />
        </div>
        <div className="flex items-center justify-between pt-4">
          {mode === 'edit' && onDelete ? (
            <Button
              type="button"
              variant="ghost"
              className="text-rose-500 hover:bg-rose-50"
              onClick={() => onDelete()}
              disabled={loading}
            >
              Delete Station
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {mode === 'create' ? 'Create' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default StationModal;
