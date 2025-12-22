/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import clsx from 'clsx';
import http from '@/lib/http';
import type { WorkOrder, WorkOrderChecklistItem } from '@/types';
import CommentThread from '@/components/comments/CommentThread';
import Badge from '@/components/common/Badge';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Modal from '@/components/common/Modal';
import { usePartsQuery, useStockItemsQuery } from '@/features/inventory';
import { useToast } from '@/context/ToastContext';
import { useAuthStore } from '@/store/authStore';

interface WorkOrderResponse extends Partial<WorkOrder> {
  _id?: string;
  id?: string;
  checklist?: unknown;
}

const createClientId = () => {
  const globalCrypto = globalThis.crypto;
  if (globalCrypto?.randomUUID) return globalCrypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const normalizeChecklistFromApi = (items: unknown): WorkOrderChecklistItem[] => {
  if (!Array.isArray(items)) return [];

  return (items as Array<Record<string, unknown>>).map((item, index) => {
    const fallbackText = item.description ?? item.text;
    const id =
      (item.id as string | undefined)
      ?? (item._id as string | undefined)
      ?? (typeof fallbackText === 'string' ? `${fallbackText}-${index}` : undefined)
      ?? createClientId();

    const completedValue =
      (item.completedValue as string | number | boolean | undefined)
      ?? (item.done as boolean | undefined);

    return {
      id,
      text: (item.text as string | undefined) ?? (item.description as string | undefined) ?? 'Checklist item',
      type: (item.type as WorkOrderChecklistItem['type']) ?? 'checkbox',
      required: Boolean(item.required),
      evidenceRequired: Boolean(item.evidenceRequired),
      evidence: (item.evidence as string[] | undefined) ?? (item.photos as string[] | undefined),
      photos: item.photos as string[] | undefined,
      completedValue,
      completedAt: (item.completedAt as string | undefined) ?? (item.completed_at as string | undefined),
      completedBy: item.completedBy as string | undefined,
      status: (item.status as WorkOrderChecklistItem['status'])
        ?? (completedValue !== undefined ? 'done' : 'not_started'),
      done: Boolean(item.done ?? (completedValue !== undefined)),
    } satisfies WorkOrderChecklistItem;
  });
};

const normalizeWorkOrder = (data: WorkOrderResponse): WorkOrder | null => {
  const id = data._id ?? data.id;
  if (!id) return null;
  return {
    id,
    title: data.title ?? 'Work Order',
    status: data.status ?? 'requested',
    priority: data.priority ?? 'medium',
    type: data.type ?? 'corrective',
    description: data.description,
    assetId: data.assetId,
    asset: data.asset,
    department: data.department ?? '',
    checklist: normalizeChecklistFromApi(data.checklist ?? data.checklists),
  } as WorkOrder;
};

const WorkOrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();
  const user = useAuthStore((state) => state.user);

  const partsQuery = usePartsQuery({ pageSize: 50 });
  const stockQuery = useStockItemsQuery();
  const [checklist, setChecklist] = useState<WorkOrderChecklistItem[]>([]);
  const [checklistSaving, setChecklistSaving] = useState(false);
  const [checklistError, setChecklistError] = useState<string | null>(null);
  const [evidenceDrafts, setEvidenceDrafts] = useState<Record<string, string>>({});
  const [partLines, setPartLines] = useState<
    { partId: string; reserved: number; issued: number; name: string }
  >([]);
  const [actionModal, setActionModal] = useState<
    { type: 'reserve' | 'issue' | 'return' | 'unreserve'; partId: string; quantity: number } | null
  >(null);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const res = await http.get<WorkOrderResponse>(`/workorders/${id}`);
        const normalized = normalizeWorkOrder(res.data);
        setWorkOrder(normalized);
        setChecklist(normalized?.checklist ?? []);
        setChecklistError(null);
        setError(null);
      } catch (err) {
        console.error(err);
        setError('Unable to load work order details.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id]);

  const availableStock = (partId: string) =>
    (stockQuery.data ?? []).filter((item) => item.partId === partId).reduce((sum, item) => sum + item.quantity, 0);

  const openAction = (type: 'reserve' | 'issue' | 'return' | 'unreserve', partId: string) => {
    setActionModal({ type, partId, quantity: 1 });
  };

  const applyAction = () => {
    if (!actionModal) return;
    const { partId, type, quantity } = actionModal;
    const line = partLines.find((entry) => entry.partId === partId) ?? {
      partId,
      reserved: 0,
      issued: 0,
      name: partsQuery.data?.items.find((p) => p.id === partId)?.name ?? partId,
    };
    const stock = availableStock(partId);
    const updated = { ...line };

    if (quantity <= 0) {
      addToast('Quantity must be greater than zero', 'error');
      return;
    }

    if (type === 'reserve') {
      const availableForReserve = stock - (line.reserved + line.issued);
      if (quantity > availableForReserve) {
        addToast('Cannot reserve more than available stock', 'error');
        return;
      }
      updated.reserved += quantity;
    }

    if (type === 'issue') {
      const availableToIssue = stock - line.issued;
      if (quantity > availableToIssue) {
        addToast('Cannot issue more than available stock', 'error');
        return;
      }
      updated.issued += quantity;
      updated.reserved = Math.max(0, updated.reserved - quantity);
    }

    if (type === 'return') {
      updated.issued = Math.max(0, updated.issued - quantity);
    }

    if (type === 'unreserve') {
      updated.reserved = Math.max(0, updated.reserved - quantity);
    }

    setPartLines((prev) => {
      const without = prev.filter((entry) => entry.partId !== partId);
      return [...without, updated];
    });
    setActionModal(null);
  };

  const isValueProvided = (value: string | number | boolean | undefined) => {
    if (value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    return true;
  };

  const updateChecklistValue = (itemId: string, value: string | number | boolean | undefined) => {
    const now = new Date().toISOString();
    setChecklist((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const hasValue = isValueProvided(value);
        return {
          ...item,
          completedValue: value,
          status: hasValue ? 'done' : 'not_started',
          done: hasValue,
          completedAt: hasValue ? now : undefined,
          completedBy: hasValue ? item.completedBy ?? user?.id : item.completedBy,
        };
      }),
    );
  };

  const addEvidence = (itemId: string) => {
    const draft = evidenceDrafts[itemId]?.trim();
    if (!draft) return;
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, evidence: [...(item.evidence ?? []), draft], completedBy: item.completedBy ?? user?.id }
          : item,
      ),
    );
    setEvidenceDrafts((prev) => ({ ...prev, [itemId]: '' }));
  };

  const removeEvidence = (itemId: string, evidence: string) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, evidence: (item.evidence ?? []).filter((ref) => ref !== evidence) }
          : item,
      ),
    );
  };

  const persistChecklist = async () => {
    if (!id || !checklist.length) return;
    setChecklistSaving(true);
    try {
      const payload = checklist.map((item) => ({
        id: item.id ?? createClientId(),
        description: item.text,
        type: item.type ?? 'checkbox',
        required: item.required,
        evidenceRequired: item.evidenceRequired,
        completedValue: item.completedValue,
        status: item.status,
        done: item.done,
        evidence: item.evidence,
        photos: item.photos,
        completedAt: item.completedAt,
        completedBy: item.completedBy,
      }));

      const res = await http.put<WorkOrderResponse>(`/workorders/${id}/checklist`, { checklist: payload });
      const normalized = normalizeWorkOrder(res.data);
      if (normalized) {
        setWorkOrder(normalized);
        setChecklist(normalized.checklist ?? []);
      }
      setChecklistError(null);
      addToast('Checklist updated', 'success');
    } catch (err) {
      console.error(err);
      setChecklistError('Unable to save checklist updates.');
    } finally {
      setChecklistSaving(false);
    }
  };

  const header = useMemo(() => {
    if (loading) {
      return <p className="text-sm text-neutral-500">Loading work order...</p>;
    }
    if (error) {
      return <p className="text-sm text-rose-500">{error}</p>;
    }
    if (!workOrder) {
      return <p className="text-sm text-neutral-500">No work order found.</p>;
    }
    return null;
  }, [loading, error, workOrder]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-indigo-300">Work order</p>
          <h1 className="text-3xl font-bold text-white">{workOrder?.title ?? 'Work order details'}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-neutral-300">
            <Badge
              text={workOrder?.status ?? 'unknown'}
              color={clsx(
                workOrder?.status === 'completed' ? 'green' : undefined,
                workOrder?.status === 'in_progress' ? 'blue' : undefined,
              )}
            />
            <Badge text={workOrder?.priority ?? 'medium'} />
            {workOrder?.assetId && (
              <Link className="text-indigo-300 hover:text-indigo-200" to={`/assets/${workOrder.assetId}`}>
                View asset
              </Link>
            )}
          </div>
          {header}
        </div>
        <Link
          to="/workorders"
          className="rounded-full border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-200 hover:bg-neutral-800"
        >
          Back to list
        </Link>
      </div>

      {workOrder && (
        <div className="rounded-3xl border border-neutral-900/80 bg-neutral-950/60 p-6 text-neutral-100">
          <h2 className="text-lg font-semibold text-white">Summary</h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-neutral-200">
            {workOrder.description ?? 'No description provided.'}
          </p>
        </div>
      )}

      <Card>
        <Card.Header>
          <div className="flex items-center justify-between">
            <div>
              <Card.Title>Checklist</Card.Title>
              <Card.Description>
                Record pass/fail results, readings, and upload evidence before closing the work order.
              </Card.Description>
            </div>
            <Button size="sm" onClick={persistChecklist} disabled={checklistSaving || !checklist.length}>
              {checklistSaving ? 'Saving…' : 'Save checklist'}
            </Button>
          </div>
        </Card.Header>
        <Card.Content>
          {!checklist.length && <p className="text-sm text-neutral-500">No checklist items configured.</p>}

          <div className="space-y-4">
            {checklist.map((item) => {
              const completionLabel = item.completedAt
                ? new Date(item.completedAt).toLocaleString()
                : undefined;
              const statusLabel = item.status ?? (isValueProvided(item.completedValue) ? 'done' : 'not_started');
              return (
                <div key={item.id} className="rounded-2xl border border-neutral-800/60 bg-neutral-950/60 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white">{item.text}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
                        <span className="rounded-full bg-neutral-800 px-2 py-1 capitalize text-neutral-200">{item.type ?? 'checkbox'}</span>
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
                      {item.completedBy && (
                        <p>
                          Signed by {item.completedBy === user?.id ? 'you' : item.completedBy}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 space-y-3">
                    {item.type === 'numeric' && (
                      <Input
                        type="number"
                        label="Reading"
                        value={typeof item.completedValue === 'number' ? item.completedValue : ''}
                        onChange={(event) =>
                          updateChecklistValue(
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
                          onChange={(event) => updateChecklistValue(item.id ?? createClientId(), event.target.value)}
                        />
                      </div>
                    )}

                    {(item.type === 'checkbox' || item.type === 'pass_fail' || !item.type) && (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant={item.completedValue === true ? 'success' : 'outline'}
                          onClick={() => updateChecklistValue(item.id ?? createClientId(), true)}
                        >
                          Pass
                        </Button>
                        <Button
                          size="sm"
                          variant={item.completedValue === false ? 'destructive' : 'outline'}
                          onClick={() => updateChecklistValue(item.id ?? createClientId(), false)}
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
                          onChange={(event) =>
                            setEvidenceDrafts((prev) => ({ ...prev, [item.id ?? '']: event.target.value }))
                          }
                          placeholder="Link to photo or document"
                        />
                        <Button size="sm" variant="secondary" onClick={() => addEvidence(item.id ?? createClientId())}>
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
                                onClick={() => removeEvidence(item.id ?? createClientId(), ref)}
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

      <Card>
        <Card.Header>
          <div className="flex items-center justify-between">
            <div>
              <Card.Title>Parts</Card.Title>
              <Card.Description>Reserve, issue, and track quantities against available stock.</Card.Description>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const firstPart = partsQuery.data?.items[0];
                if (firstPart) openAction('reserve', firstPart.id);
              }}
            >
              Add part
            </Button>
          </div>
        </Card.Header>
        <Card.Content>
          {partsQuery.isLoading && <p className="text-sm text-neutral-500">Loading parts…</p>}
          {partsQuery.error && <p className="text-sm text-rose-500">Unable to load parts.</p>}
          {!partsQuery.isLoading && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-800/50 text-sm">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-neutral-200">Part</th>
                    <th className="px-3 py-2 text-left font-medium text-neutral-200">Reserved</th>
                    <th className="px-3 py-2 text-left font-medium text-neutral-200">Issued</th>
                    <th className="px-3 py-2 text-left font-medium text-neutral-200">Available</th>
                    <th className="px-3 py-2 text-left font-medium text-neutral-200">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/40">
                  {partLines.map((line) => (
                    <tr key={line.partId}>
                      <td className="px-3 py-2 text-neutral-50">{line.name}</td>
                      <td className="px-3 py-2 text-neutral-200">{line.reserved}</td>
                      <td className="px-3 py-2 text-neutral-200">{line.issued}</td>
                      <td className="px-3 py-2 text-neutral-200">{availableStock(line.partId)}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <Button size="xs" variant="outline" onClick={() => openAction('reserve', line.partId)}>
                            Reserve
                          </Button>
                          <Button size="xs" variant="outline" onClick={() => openAction('issue', line.partId)}>
                            Issue
                          </Button>
                          <Button size="xs" variant="ghost" onClick={() => openAction('return', line.partId)}>
                            Return
                          </Button>
                          <Button size="xs" variant="ghost" onClick={() => openAction('unreserve', line.partId)}>
                            Unreserve
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!partLines.length && (
                    <tr>
                      <td className="px-3 py-4 text-center text-neutral-400" colSpan={5}>
                        No parts reserved yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card.Content>
      </Card>

      <Modal
        open={Boolean(actionModal)}
        onClose={() => setActionModal(null)}
        title={`${actionModal?.type ?? ''} part`}
      >
        <div className="space-y-3">
          <label className="text-sm font-medium text-neutral-800">Part</label>
          <select
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            value={actionModal?.partId ?? ''}
            onChange={(event) =>
              setActionModal((prev) => (prev ? { ...prev, partId: event.target.value } : prev))
            }
          >
            {partsQuery.data?.items.map((part) => (
              <option key={part.id} value={part.id}>
                {part.name}
              </option>
            ))}
          </select>
          <Input
            type="number"
            label="Quantity"
            min={1}
            value={actionModal?.quantity ?? 1}
            onChange={(event) =>
              setActionModal((prev) => (prev ? { ...prev, quantity: Number(event.target.value) } : prev))
            }
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setActionModal(null)}>
              Cancel
            </Button>
            <Button onClick={applyAction}>Apply</Button>
          </div>
        </div>
      </Modal>

      {id ? (
        <CommentThread entityType="WO" entityId={id} />
      ) : (
        <p className="text-sm text-neutral-500">Work order id required to load comments.</p>
      )}
    </div>
  );
};

export default WorkOrderDetail;
