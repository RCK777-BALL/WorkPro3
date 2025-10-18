/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useState } from 'react';
import Button from '@common/Button';

import Modal from './Modal';

interface DepartmentForm {
  name: string;
  notes: string;
}

interface DepartmentModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialData?: Partial<DepartmentForm>;
  onSubmit: (form: DepartmentForm) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
  onClose: () => void;
  loading?: boolean;
}

const emptyForm: DepartmentForm = {
  name: '',
  notes: '',
};

const DepartmentModal = ({
  isOpen,
  mode,
  initialData,
  onSubmit,
  onDelete,
  onClose,
  loading = false,
}: DepartmentModalProps) => {
  const [form, setForm] = useState<DepartmentForm>(emptyForm);

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
      title={mode === 'create' ? 'Add Department' : 'Edit Department'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
          <input
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            required
            placeholder="Body Shop"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
          <textarea
            className="h-24 w-full resize-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            value={form.notes}
            onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            placeholder="Optional notes about this department"
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
              Delete Department
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

export default DepartmentModal;
