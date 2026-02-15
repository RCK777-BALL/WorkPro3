/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useState } from 'react';

import Button from '@/components/common/Button';
import FailureInsightCard from '@/components/ai/FailureInsightCard';
import { useFailurePrediction } from '@/hooks/useAiInsights';
import { useToast } from '@/context/ToastContext';
import type { PMTemplateAssignment, ProcedureTemplateSummary } from '@/types';
import { useQuery } from 'react-query';
import { fetchProcedureTemplates } from '@/api/pmProcedures';
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
  assignment?: PMTemplateAssignment | null;
  assets: Array<{ id: string; name: string }>;
  partOptions: Array<{ id: string; name: string }>;
  onSuccess?: () => void;
  fixedAssetId?: string;
}

const newId = () => Math.random().toString(36).slice(2);

const DEFAULT_INTERVALS = ['weekly', 'monthly', 'quarterly', 'annually'];

const AssignmentForm = ({ templateId, assignment, assets, partOptions, onSuccess, fixedAssetId }: AssignmentFormProps) => {
  const { mutateAsync, isLoading } = useUpsertAssignment();
  const { addToast } = useToast();
  const [error, setError] = useState<string | null>(null);

  const [assetId, setAssetId] = useState(assignment?.assetId ?? fixedAssetId ?? '');
  const [interval, setInterval] = useState(assignment?.interval ?? 'monthly');
  const [triggerType, setTriggerType] = useState<'time' | 'meter'>(
    assignment?.usageMetric ? 'meter' : 'time',
  );
  const [meterThreshold, setMeterThreshold] = useState<number | ''>(assignment?.usageTarget ?? '');
  const [procedureTemplateId, setProcedureTemplateId] = useState(assignment?.procedureTemplateId ?? '');
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
  const procedureTemplatesQuery = useQuery(['pm', 'procedures'], fetchProcedureTemplates);
  const aiPrediction = useFailurePrediction({ assetId });
  const showAiInsight = Boolean(assetId || aiPrediction.isLoading || aiPrediction.error);

  const resolveIntervalFromDays = (days?: number) => {
    if (!days) return interval;
    if (days <= 10) return 'weekly';
    if (days <= 45) return 'monthly';
    if (days <= 120) return 'quarterly';
    return 'annually';
  };

  const applyPmDraft = () => {
    const draft = aiPrediction.data?.pmTemplateDraft;
    if (!draft) return;
    setInterval(resolveIntervalFromDays(draft.intervalDays));
    setChecklist(
      draft.checklist.map((item) => ({
        id: newId(),
        description: item,
        required: true,
      })),
    );
    setRequiredParts(
      draft.parts.map((part) => {
        const matched = partOptions.find(
          (option) => option.name.toLowerCase() === part.name.toLowerCase(),
        );
        return {
          id: newId(),
          partId: matched?.id ?? part.partId ?? '',
          quantity: part.quantity ?? 1,
        };
      }),
    );
  };

  useEffect(() => {
    setAssetId(assignment?.assetId ?? fixedAssetId ?? '');
    setInterval(assignment?.interval ?? 'monthly');
    setTriggerType(assignment?.usageMetric ? 'meter' : 'time');
    setMeterThreshold(assignment?.usageTarget ?? '');
    setProcedureTemplateId(assignment?.procedureTemplateId ?? '');
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
    if (!assetId && fixedAssetId) {
      setAssetId(fixedAssetId);
    } else if (!assetId && assets.length > 0) {
      setAssetId(assets[0].id);
    }
  }, [assets, assetId, fixedAssetId]);

  const hasChecklistContent = useMemo(() => checklist.some((item) => item.description.trim().length > 0), [checklist]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!assetId) {
      setError('Please select an asset to link');
      return;
    }
    if (triggerType === 'meter' && (!meterThreshold || meterThreshold <= 0)) {
      setError('Provide a meter threshold greater than 0');
      return;
    }
    setError(null);
    try {
      await mutateAsync({
        templateId,
        payload: {
          assignmentId: assignment?.id,
          assetId,
          interval: triggerType === 'time' ? interval : undefined,
          usageMetric: triggerType === 'meter' ? 'runHours' : undefined,
          usageTarget: triggerType === 'meter' && meterThreshold ? meterThreshold : undefined,
          procedureTemplateId: procedureTemplateId || undefined,
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
      {showAiInsight && (
        <div className="space-y-2 rounded-lg border border-neutral-200 bg-white p-3 shadow-sm">
          <FailureInsightCard
            title="AI PM assist"
            insight={aiPrediction.data}
            loading={aiPrediction.isLoading}
            error={aiPrediction.error}
            onRetry={() => aiPrediction.refetch()}
          />
          {aiPrediction.data?.pmTemplateDraft && (
            <div className="flex items-start justify-between gap-3 rounded-md border border-dashed border-primary-200 bg-primary-50/70 p-3">
              <div>
                <p className="text-sm font-semibold text-neutral-900">Apply suggested PM draft</p>
                <p className="text-xs text-neutral-600">
                  Prefills interval, checklist, and parts using meter/work-order signals.
                </p>
              </div>
              <Button size="sm" variant="outline" type="button" onClick={applyPmDraft}>
                Apply
              </Button>
            </div>
          )}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-neutral-700">Asset</label>
        <select
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
          value={assetId}
          onChange={(event) => setAssetId(event.target.value)}
          disabled={Boolean(fixedAssetId)}
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
        <label className="block text-sm font-medium text-neutral-700">Procedure template</label>
        <select
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
          value={procedureTemplateId}
          onChange={(event) => setProcedureTemplateId(event.target.value)}
        >
          <option value="">No procedure attached</option>
          {(procedureTemplatesQuery.data ?? []).map((template: ProcedureTemplateSummary) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
        {procedureTemplatesQuery.isError && (
          <p className="mt-1 text-xs text-error-500">Unable to load procedure templates.</p>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700">Trigger type</label>
        <div className="mt-1 flex flex-wrap gap-3">
          {['time', 'meter'].map((type) => (
            <label key={type} className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="radio"
                name="triggerType"
                value={type}
                checked={triggerType === type}
                onChange={() => setTriggerType(type as 'time' | 'meter')}
              />
              {type === 'time' ? 'Time-based' : 'Meter-based'}
            </label>
          ))}
        </div>
      </div>
      {triggerType === 'time' ? (
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
      ) : (
        <div>
          <label className="block text-sm font-medium text-neutral-700">Meter threshold</label>
          <input
            type="number"
            min={1}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
            value={meterThreshold}
            onChange={(event) => setMeterThreshold(event.target.value ? Number(event.target.value) : '')}
            placeholder="e.g. 100"
          />
          <p className="mt-1 text-xs text-neutral-500">Create a work order once the meter increases by this amount.</p>
        </div>
      )}
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
