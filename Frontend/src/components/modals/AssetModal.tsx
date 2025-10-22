/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useState } from 'react';
import Button from '@common/Button';

import Modal from './Modal';

const typeOptions = ['Electrical', 'Mechanical', 'Tooling', 'Interface'] as const;
const statusOptions = ['Active', 'Offline', 'In Repair'] as const;
const criticalityOptions = ['high', 'medium', 'low'] as const;

type AssetType = (typeof typeOptions)[number];

type AssetForm = {
  name: string;
  type: AssetType;
  status: string;
  location: string;
  notes: string;
  criticality: 'high' | 'medium' | 'low';
};

interface AssetModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  hierarchyPath?: {
    department?: string;
    line?: string;
    station?: string;
  };
  initialData?: Partial<AssetForm>;
  onSubmit: (form: AssetForm) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
  onClose: () => void;
  loading?: boolean;
}

const defaultForm: AssetForm = {
  name: '',
  type: 'Electrical',
  status: 'Active',
  location: '',
  notes: '',
  criticality: 'medium',
};

const AssetModal = ({
  isOpen,
  mode,
  hierarchyPath,
  initialData,
  onSubmit,
  onDelete,
  onClose,
  loading = false,
}: AssetModalProps) => {
  const [form, setForm] = useState<AssetForm>(defaultForm);

  useEffect(() => {
    if (isOpen) {
      setForm({
        name: initialData?.name ?? '',
        type: (initialData?.type as AssetType) ?? 'Electrical',
        status: initialData?.status ?? 'Active',
        location: initialData?.location ?? '',
        notes: initialData?.notes ?? '',
        criticality: initialData?.criticality ?? 'medium',
      });
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    await onSubmit({
      ...form,
      name: form.name.trim(),
      location: form.location.trim(),
      notes: form.notes.trim(),
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Add Asset' : 'Edit Asset'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {(hierarchyPath?.department || hierarchyPath?.line || hierarchyPath?.station) && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium text-slate-600">
            {hierarchyPath.department && <span>Department: {hierarchyPath.department}</span>}
            {hierarchyPath.line && <span>Line: {hierarchyPath.line}</span>}
            {hierarchyPath.station && <span>Station: {hierarchyPath.station}</span>}
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="col-span-1 md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
            <input
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              required
              placeholder="Fanuc 100iC 6L"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Type</label>
            <select
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              value={form.type}
              onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as AssetType }))}
            >
              {typeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
            <select
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              value={form.status}
              onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Criticality</label>
            <select
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              value={form.criticality}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, criticality: event.target.value as AssetForm['criticality'] }))
              }
            >
              {criticalityOptions.map((option) => (
                <option key={option} value={option} className="uppercase">
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Location</label>
            <input
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              value={form.location}
              onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
              placeholder="Station 100"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
            <textarea
              className="h-28 w-full resize-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              placeholder="Optional notes about this asset"
            />
          </div>
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
              Delete Asset
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

export default AssetModal;
