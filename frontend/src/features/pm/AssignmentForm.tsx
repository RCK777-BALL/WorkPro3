/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useState } from 'react';

import Button from '@/components/common/Button';
import { useToast } from '@/context/ToastContext';
import type { PMTemplateAssignment } from '@/types';
import { useUpsertAssignment } from './hooks';

interface ChecklistFormItem {
  id: string;
  description: string;
  required: boolean;
}

interface PartFormItem {
  id: string;
  partId: string;
  quantity: number;
}

interface AssignmentFormProps {
  templateId: string;
  assignment?: PMTemplateAssignment;
  assets: Array<{ id: string; name: string }>;
  partOptions: Array<{ id: string; name: string }>;
  onSuccess?: () => void;
}

const newId = () => Math.random().toString(36).slice(2);

const DEFAULT_INTERVALS = ['weekly', 'monthly', 'quarterly', 'annually'];

const AssignmentForm = ({ templateId, assignment, assets, partOptions, onSuccess }: AssignmentFormProps) => {
  const { mutateAsync, isLoading } = useUpsertAssignment();
  const { addToast } = useToast();
  const [error, setError] = useState<string | null>(null);

  const [assetId, setAssetId] = useState(assignment?.assetId ?? '');
  const [interval, setInterval] = useState(assignment?.interval ?? 'monthly');
  const [checklist, setChecklist] = useState<ChecklistFormItem[]>(
    assignment?.checklist.map((item) => ({
      id: item.id || newId(),
      description: item.description,
      required: item.required ?? true,
    })) ?? [{ id: newId(), description: '', required: true }],
  );
  const [requiredParts, setRequiredParts] = useState<PartFormItem[]>(
    assignment?.requiredParts.map((part) => ({
      id: part.id || newId(),
      partId: part.partId,
      quantity: part.quantity ?? 1,
    })) ?? [],
  );

  useEffect(() => {
    setAssetId(assignment?.assetId ?? '');
    setInterval(assignment?.interval ?? 'monthly');
    setChecklist(
      assignment?.checklist.map((item) => ({
        id: item.id || newId(),
        description: item.description,
        required: item.required ?? true,
      })) ?? [{ id: newId(), description: '', required: true }],
    );
    setRequiredParts(
      assignment?.requiredParts.map((part) => ({
        id: part.id || newId(),
        partId: part.partId,
        quantity: part.quantity ?? 1,
      })) ?? [],
    );
  }, [assignment]);

  useEffect(() => {
    if (!assetId && assets.length > 0) {
      setAssetId(assets[0].id);
    }
  }, [assets, assetId]);

  const hasChecklistContent = useMemo(() => checklist.some((item) => item.description.trim().length > 0), [checklist]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!assetId) {
      setError('Please select an asset to link');
      return;
    }
    setError(null);
    try {
      await mutateAsync({
        templateId,
        payload: {
          assignmentId: assignment?.id,
          assetId,
          interval,
          checklist: checklist
            .filter((item) => item.description.trim().length > 0)
            .map((item) => ({ description: item.description.trim(), required: item.required })),
          requiredParts: requiredParts
            .filter((part) => part.partId)
            .map((part) => ({ partId: part.partId, quantity: part.quantity })),
        },
      });
      addToast(assignment ? 'Assignment updated' : 'Assignment created', 'success');
      onSuccess?.();
    } catch (err) {
      console.error(err);
      addToast('Unable to save assignment', 'error');
      setError((err as { message?: string }).message ?? 'Failed to save assignment');
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {error && <p className="text-sm text-error-500">{error}</p>}
      <div>
        <label className="block text-sm font-medium text-neutral-700">Asset</label>
        <select
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
          value={assetId}
          onChange={(event) => setAssetId(event.target.value)}
        >
          {assets.length === 0 && <option value="">No assets available</option>}
          {assets.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700">Interval</label>
        <select
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
          value={interval}
          onChange={(event) => setInterval(event.target.value)}
        >
          {DEFAULT_INTERVALS.map((option) => (
            <option key={option} value={option}>
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-neutral-700">Checklist</label>
          <Button type="button" size="sm" variant="ghost" onClick={() => setChecklist((prev) => [...prev, { id: newId(), description: '', required: true }])}>
            Add step
          </Button>
        </div>
        <div className="mt-2 space-y-2">
          {checklist.map((item, index) => (
            <div key={item.id} className="flex items-center gap-2">
              <input
                type="text"
                className="flex-1 rounded-md border border-neutral-300 px-3 py-2"
                placeholder={`Step ${index + 1}`}
                value={item.description}
                onChange={(event) =>
                  setChecklist((prev) =>
                    prev.map((entry) =>
                      entry.id === item.id ? { ...entry, description: event.target.value } : entry,
                    ),
                  )
                }
              />
              <label className="flex items-center gap-1 text-sm text-neutral-600">
                <input
                  type="checkbox"
                  checked={item.required}
                  onChange={(event) =>
                    setChecklist((prev) =>
                      prev.map((entry) =>
                        entry.id === item.id ? { ...entry, required: event.target.checked } : entry,
                      ),
                    )
                  }
                />
                Required
              </label>
              <button
                type="button"
                className="text-sm text-neutral-500 hover:text-error-500"
                onClick={() => setChecklist((prev) => prev.filter((entry) => entry.id !== item.id))}
                aria-label="Remove step"
              >
                Remove
              </button>
            </div>
          ))}
          {!hasChecklistContent && (
            <p className="text-xs text-neutral-500">Add at least one checklist step to guide technicians.</p>
          )}
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-neutral-700">Required parts</label>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setRequiredParts((prev) => [...prev, { id: newId(), partId: '', quantity: 1 }])}
          >
            Add part
          </Button>
        </div>
        <div className="mt-2 space-y-2">
          {requiredParts.map((part) => (
            <div key={part.id} className="flex flex-wrap items-center gap-2">
              <select
                className="flex-1 min-w-[200px] rounded-md border border-neutral-300 px-3 py-2"
                value={part.partId}
                onChange={(event) =>
                  setRequiredParts((prev) =>
                    prev.map((entry) => (entry.id === part.id ? { ...entry, partId: event.target.value } : entry)),
                  )
                }
              >
                <option value="">Select part</option>
                {partOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                className="w-24 rounded-md border border-neutral-300 px-2 py-2"
                value={part.quantity}
                onChange={(event) =>
                  setRequiredParts((prev) =>
                    prev.map((entry) =>
                      entry.id === part.id ? { ...entry, quantity: Number(event.target.value) || 1 } : entry,
                    ),
                  )
                }
              />
              <button
                type="button"
                className="text-sm text-neutral-500 hover:text-error-500"
                onClick={() => setRequiredParts((prev) => prev.filter((entry) => entry.id !== part.id))}
                aria-label="Remove part"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" variant="primary" loading={isLoading} disabled={assets.length === 0}>
          {assignment ? 'Update assignment' : 'Create assignment'}
        </Button>
      </div>
    </form>
  );
};

export default AssignmentForm;
