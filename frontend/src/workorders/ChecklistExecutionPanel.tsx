/*
 * SPDX-License-Identifier: MIT
 */

import clsx from 'clsx';

import type { WorkOrderChecklistItem } from '@/types';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import Input from '@/components/common/Input';

interface ChecklistExecutionPanelProps {
  checklist: WorkOrderChecklistItem[];
  checklistSaving: boolean;
  checklistError?: string | null;
  evidenceDrafts: Record<string, string>;
  userId?: string;
  onSave: () => void;
  onUpdateValue: (itemId: string, value: string | number | boolean | undefined) => void;
  onUpdateDraft: (itemId: string, value: string) => void;
  onAddEvidence: (itemId: string) => void;
  onRemoveEvidence: (itemId: string, evidence: string) => void;
  createClientId: () => string;
  isValueProvided: (value: unknown) => boolean;
}

const ChecklistExecutionPanel = ({
  checklist,
  checklistSaving,
  checklistError,
  evidenceDrafts,
  userId,
  onSave,
  onUpdateValue,
  onUpdateDraft,
  onAddEvidence,
  onRemoveEvidence,
  createClientId,
  isValueProvided,
}: ChecklistExecutionPanelProps) => (
  <Card>
    <Card.Header>
      <div className="flex items-center justify-between">
        <div>
          <Card.Title>Checklist</Card.Title>
          <Card.Description>
            Record pass/fail results, readings, and upload evidence before closing the work order.
          </Card.Description>
        </div>
        <Button size="sm" onClick={onSave} disabled={checklistSaving || !checklist.length}>
          {checklistSaving ? 'Saving…' : 'Save checklist'}
        </Button>
      </div>
    </Card.Header>
    <Card.Content>
      {!checklist.length && <p className="text-sm text-neutral-500">No checklist items configured.</p>}

      <div className="space-y-4">
        {checklist.map((item) => {
          const completionLabel = item.completedAt ? new Date(item.completedAt).toLocaleString() : undefined;
          const statusLabel = item.status ?? (isValueProvided(item.completedValue) ? 'done' : 'not_started');
          return (
            <div key={item.id} className="rounded-2xl border border-neutral-800/60 bg-neutral-950/60 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">{item.text}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
                    <span className="rounded-full bg-neutral-800 px-2 py-1 capitalize text-neutral-200">
                      {item.type ?? 'checkbox'}
                    </span>
                    {item.required && (
                      <span className="rounded-full bg-amber-500/10 px-2 py-1 text-amber-300">Required</span>
                    )}
                    {item.evidenceRequired && (
                      <span className="rounded-full bg-sky-500/10 px-2 py-1 text-sky-300">Evidence required</span>
                    )}
                    <span
                      className={clsx(
                        'rounded-full px-2 py-1 capitalize',
                        statusLabel === 'done'
                          ? 'bg-emerald-500/10 text-emerald-300'
                          : 'bg-neutral-800 text-neutral-300',
                      )}
                    >
                      {statusLabel.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                <div className="text-right text-xs text-neutral-400">
                  {completionLabel && <p>Completed at {completionLabel}</p>}
                  {item.completedBy && <p>Signed by {item.completedBy === userId ? 'you' : item.completedBy}</p>}
                </div>
              </div>

              <div className="mt-3 space-y-3">
                {item.type === 'numeric' && (
                  <Input
                    type="number"
                    label="Reading"
                    value={typeof item.completedValue === 'number' ? item.completedValue : ''}
                    onChange={(event) =>
                      onUpdateValue(
                        item.id ?? createClientId(),
                        event.target.value === '' ? undefined : Number(event.target.value),
                      )
                    }
                  />
                )}

                {item.type === 'text' && (
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-neutral-200">Notes</label>
                    <textarea
                      className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100"
                      placeholder="Enter response"
                      value={typeof item.completedValue === 'string' ? item.completedValue : ''}
                      onChange={(event) => onUpdateValue(item.id ?? createClientId(), event.target.value)}
                    />
                  </div>
                )}

                {(item.type === 'checkbox' || item.type === 'pass_fail' || !item.type) && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={item.completedValue === true ? 'success' : 'outline'}
                      onClick={() => onUpdateValue(item.id ?? createClientId(), true)}
                    >
                      Pass
                    </Button>
                    <Button
                      size="sm"
                      variant={item.completedValue === false ? 'destructive' : 'outline'}
                      onClick={() => onUpdateValue(item.id ?? createClientId(), false)}
                    >
                      Fail
                    </Button>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      label="Evidence URL or reference"
                      value={evidenceDrafts[item.id ?? ''] ?? ''}
                      onChange={(event) => onUpdateDraft(item.id ?? '', event.target.value)}
                      placeholder="Link to photo or document"
                    />
                    <Button size="sm" variant="secondary" onClick={() => onAddEvidence(item.id ?? createClientId())}>
                      Add
                    </Button>
                  </div>
                  {(item.evidence ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {item.evidence?.map((ref) => (
                        <span
                          key={ref}
                          className="inline-flex items-center gap-2 rounded-full bg-neutral-800 px-3 py-1 text-xs text-neutral-100"
                        >
                          {ref}
                          <button
                            type="button"
                            className="text-neutral-400 hover:text-white"
                            onClick={() => onRemoveEvidence(item.id ?? createClientId(), ref)}
                            aria-label={`Remove evidence ${ref}`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {checklistError && <p className="mt-3 text-sm text-rose-400">{checklistError}</p>}
    </Card.Content>
  </Card>
);

export default ChecklistExecutionPanel;
