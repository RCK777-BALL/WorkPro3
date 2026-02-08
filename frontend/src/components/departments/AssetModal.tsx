/*
 * SPDX-License-Identifier: MIT
 */

import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react';
import SlideOver from '@/components/common/SlideOver';
import Button from '@/components/common/Button';
import type { Asset } from '@/types';

const assetTypes: Asset['type'][] = ['Electrical', 'Mechanical', 'Tooling', 'Interface', 'Welding'];
const statusOptions = ['Active', 'Offline', 'In Repair'];
const assetNameTemplate =
  'Manufacturer + Model | Short description | Station / install | Line | Department | Serial | Plant or $ | Date installed | Warranty | Criticality | Asset type';

interface AssetModalProps {
  open: boolean;
  initial?: Asset | null;
  loading?: boolean;
  assetOptions?: Array<{ id: string; name: string }>;
  assetsLoading?: boolean;
  onClose: () => void;
  onSave: (values: {
    name: string;
    type: Asset['type'];
    status?: string;
    description?: string;
    notes?: string;
    location?: string;
    lastServiced?: string;
  }) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
}

const AssetModal = ({
  open,
  initial,
  loading = false,
  assetOptions = [],
  assetsLoading = false,
  onClose,
  onSave,
  onDelete,
}: AssetModalProps) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<Asset['type']>('Electrical');
  const [status, setStatus] = useState('Active');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState('');
  const [lastServiced, setLastServiced] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setName(initial?.name ?? '');
    setType(initial?.type ?? 'Electrical');
    setStatus(initial?.status ?? 'Active');
    setDescription(initial?.description ?? '');
    setNotes(initial?.notes ?? '');
    setLocation(initial?.location ?? '');
    setLastServiced(initial?.lastServiced ?? '');
    setTouched(false);
  }, [initial, open]);

  const handleSubmit = (event?: FormEvent) => {
    event?.preventDefault();
    if (!name.trim()) {
      setTouched(true);
      return;
    }
    void onSave({
      name: name.trim(),
      type,
      status,
      description: description.trim() || undefined,
      notes: notes.trim() || undefined,
      location: location.trim() || undefined,
      lastServiced: lastServiced || undefined,
    });
  };

  const error = touched && !name.trim() ? 'Asset name is required' : null;
  const hasAssetOptions = assetOptions.length > 0;

  return (
    <SlideOver
      open={open}
      title={`${initial ? 'Edit Asset' : 'Add Asset'}`}
      onClose={onClose}
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          {initial && onDelete ? (
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                void onDelete();
              }}
              loading={loading}
            >
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleSubmit()}
              loading={loading}
            >
              Save
            </Button>
          </div>
        </div>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100">
              Asset name
            </label>
            <select
              value={name}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => setName(event.target.value)}
              onBlur={() => setTouched(true)}
              disabled={assetsLoading || !hasAssetOptions}
              className="mt-1 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-neutral-700 dark:bg-neutral-900"
            >
              <option value="">
                {assetsLoading
                  ? 'Loading assets...'
                  : hasAssetOptions
                    ? 'Select asset'
                    : 'No assets available'}
              </option>
              {assetOptions.map((asset) => (
                <option key={asset.id} value={asset.name}>
                  {asset.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-neutral-500">
              Suggested format: {assetNameTemplate}
            </p>
            {error && <p className="mt-1 text-sm text-error-600">{error}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100">Type</label>
            <select
              value={type}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                setType(event.target.value as Asset['type'])
              }
              className="mt-1 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-neutral-700 dark:bg-neutral-900"
            >
              {assetTypes.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100">
              Status
            </label>
            <select
              value={status}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => setStatus(event.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-neutral-700 dark:bg-neutral-900"
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100">
              Last serviced
            </label>
            <input
              type="date"
              value={lastServiced}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setLastServiced(event.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-neutral-700 dark:bg-neutral-900"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100">
            Location
          </label>
          <input
            value={location}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setLocation(event.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-neutral-700 dark:bg-neutral-900"
            placeholder="Location"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100">
            Description
          </label>
          <textarea
            value={description}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setDescription(event.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-neutral-700 dark:bg-neutral-900"
            rows={3}
            placeholder="Short description"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setNotes(event.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-neutral-700 dark:bg-neutral-900"
            rows={3}
            placeholder="Internal notes"
          />
        </div>
      </form>
    </SlideOver>
  );
};

export default AssetModal;
