/*
 * SPDX-License-Identifier: MIT
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  ImagePlus,
  PackagePlus,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  WifiOff,
} from 'lucide-react';

import Button from '@/components/common/Button';
import Badge from '@/components/common/Badge';
import type { Part, WorkOrder } from '@/types';
import {
  fetchTechnicianWorkOrders,
  logTechnicianPartUsage,
  normalizeTechnicianWorkOrder,
  type TechnicianPartUsagePayload,
  type TechnicianStatePayload,
  updateTechnicianWorkOrderState,
  uploadTechnicianPhotos,
} from '@/api/technician';
import { emitToast } from '@/context/ToastContext';
import { safeLocalStorage } from '@/utils/safeLocalStorage';
import {
  enqueueTechnicianPartUsageRequest,
  enqueueTechnicianStateRequest,
} from '@/utils/offlineQueue';
import { usePartsQuery } from '@/features/inventory/hooks';

type PartDraft = { partId?: string; qty?: number };

type PartUsageEntry = TechnicianPartUsagePayload['entries'][number];

const CACHE_KEY = 'technician:work-orders';

const toMinutes = (value?: string): number | undefined => {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

const mergePartUsage = (
  existing: WorkOrder['partsUsed'] | undefined,
  additions: PartUsageEntry[],
): WorkOrder['partsUsed'] => {
  const map = new Map<string, { partId: string; qty: number; cost: number }>();
  (existing ?? []).forEach((entry) => {
    if (!entry?.partId) return;
    const key = entry.partId;
    map.set(key, { partId: key, qty: entry.qty ?? 0, cost: entry.cost ?? 0 });
  });
  additions.forEach((entry) => {
    const current = map.get(entry.partId) ?? { partId: entry.partId, qty: 0, cost: 0 };
    current.qty += entry.qty;
    if (entry.cost !== undefined) {
      current.cost = entry.cost;
    }
    map.set(entry.partId, current);
  });
  return Array.from(map.values());
};

const applyLocalState = (
  order: WorkOrder,
  action: TechnicianStatePayload['action'],
  minutes?: number,
): WorkOrder => {
  const next: WorkOrder = { ...order };
  if (action === 'start' || action === 'resume') {
    next.status = 'in_progress';
  } else if (action === 'pause') {
    next.status = 'paused';
  } else if (action === 'complete') {
    next.status = 'completed';
    next.completedAt = new Date().toISOString();
  }

  if (minutes && minutes > 0) {
    next.timeSpentMin = (next.timeSpentMin ?? 0) + minutes;
  }
  return next;
};

const TechnicianWorkspace = () => {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [timeDrafts, setTimeDrafts] = useState<Record<string, string>>({});
  const [partDrafts, setPartDrafts] = useState<Record<string, PartDraft>>({});
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const partsQuery = usePartsQuery({ pageSize: 200, sortBy: 'name' });
  const partLookup = useMemo(() => {
    const lookup = new Map<string, Part>();
    (partsQuery.data?.items ?? []).forEach((part) => {
      lookup.set(part.id, part);
    });
    return lookup;
  }, [partsQuery.data]);

  const persistOrders = useCallback((orders: WorkOrder[]) => {
    safeLocalStorage.setItem(CACHE_KEY, JSON.stringify(orders));
  }, []);

  const replaceOrder = useCallback(
    (updated: WorkOrder) => {
      setWorkOrders((prev) => {
        const exists = prev.some((item) => item.id === updated.id);
        const next = exists
          ? prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item))
          : [...prev, updated];
        persistOrders(next);
        return next;
      });
    },
    [persistOrders],
  );

  const setOrders = useCallback(
    (orders: WorkOrder[]) => {
      setWorkOrders(orders);
      persistOrders(orders);
    },
    [persistOrders],
  );

  const loadFromCache = useCallback(() => {
    const cached = safeLocalStorage.getItem(CACHE_KEY);
    if (!cached) {
      setError('No cached technician work orders are available.');
      return [];
    }
    try {
      const parsed = JSON.parse(cached) as WorkOrder[];
      setWorkOrders(parsed);
      setError('Showing cached technician work orders.');
      return parsed;
    } catch {
      setError('Unable to read cached technician work orders.');
      return [];
    }
  }, []);

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    if (!navigator.onLine) {
      loadFromCache();
      setLoading(false);
      return;
    }
    try {
      const response = await fetchTechnicianWorkOrders();
      const normalized = response.map((item) => normalizeTechnicianWorkOrder(item));
      setOrders(normalized);
      setError(null);
      if (normalized.length) {
        setSelectedId((current) => current ?? normalized[0].id);
      }
    } catch (err) {
      console.error(err);
      const cached = loadFromCache();
      if (!cached.length) {
        setError('Unable to load assigned work orders.');
      }
    } finally {
      setLoading(false);
    }
  }, [loadFromCache, setOrders]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    void fetchAssignments();
  }, [fetchAssignments]);

  useEffect(() => {
    if (!selectedId && workOrders.length) {
      setSelectedId(workOrders[0].id);
    }
  }, [selectedId, workOrders]);

  const selectedOrder = workOrders.find((order) => order.id === selectedId) ?? workOrders[0];

  const applyAction = useCallback(
    async (order: WorkOrder, action: TechnicianStatePayload['action']) => {
      if (!order) return;
      const minutes = toMinutes(timeDrafts[order.id]);
      const payload: TechnicianStatePayload = { action };
      if (minutes && (action === 'complete' || action === 'log_time')) {
        payload.minutesWorked = minutes;
      }
      if (action === 'log_time' && !payload.minutesWorked) {
        emitToast('Enter a time value before logging work.', 'error');
        return;
      }

      const optimistic = applyLocalState(order, action, payload.minutesWorked);
      const actionKey = `${order.id}:${action}`;
      setPendingAction(actionKey);

      if (!navigator.onLine) {
        enqueueTechnicianStateRequest(order.id, payload);
        replaceOrder(optimistic);
        if (action === 'log_time' || action === 'complete') {
          setTimeDrafts((drafts) => ({ ...drafts, [order.id]: '' }));
        }
        emitToast('Action queued and will sync when back online.', 'success');
        setPendingAction(null);
        return;
      }

      try {
        const response = await updateTechnicianWorkOrderState(order.id, payload);
        const normalized = normalizeTechnicianWorkOrder(response);
        replaceOrder(normalized);
        if (action === 'log_time' || action === 'complete') {
          setTimeDrafts((drafts) => ({ ...drafts, [order.id]: '' }));
        }
        emitToast('Work order updated.');
      } catch (err) {
        console.error(err);
        emitToast('Unable to update the work order.', 'error');
      } finally {
        setPendingAction(null);
      }
    },
    [replaceOrder, timeDrafts],
  );

  const handlePartSubmit = useCallback(
    async (order: WorkOrder) => {
      if (!order) return;
      const draft = partDrafts[order.id];
      if (!draft?.partId || !draft.qty || draft.qty <= 0) {
        emitToast('Select a part and quantity before logging usage.', 'error');
        return;
      }
      const part = partLookup.get(draft.partId);
      const payload: TechnicianPartUsagePayload = {
        entries: [
          {
            partId: draft.partId,
            qty: draft.qty,
            cost: part?.unitCost,
          },
        ],
      };

      const actionKey = `${order.id}:parts`;
      setPendingAction(actionKey);

      if (!navigator.onLine) {
        enqueueTechnicianPartUsageRequest(order.id, payload);
        const merged = mergePartUsage(order.partsUsed, payload.entries);
        replaceOrder({ ...order, partsUsed: merged });
        setPartDrafts((prev) => ({ ...prev, [order.id]: {} }));
        emitToast('Part usage queued for sync.', 'success');
        setPendingAction(null);
        return;
      }

      try {
        const response = await logTechnicianPartUsage(order.id, payload);
        const normalized = normalizeTechnicianWorkOrder(response);
        replaceOrder(normalized);
        setPartDrafts((prev) => ({ ...prev, [order.id]: {} }));
        emitToast('Part usage recorded.');
      } catch (err) {
        console.error(err);
        emitToast('Unable to log part usage.', 'error');
      } finally {
        setPendingAction(null);
      }
    },
    [partDrafts, partLookup, replaceOrder],
  );

  const handleAttachmentUpload = useCallback(
    async (order: WorkOrder, files: FileList | null) => {
      if (!order || !files?.length) return;
      if (!navigator.onLine) {
        emitToast('Attachments can only be uploaded while online.', 'error');
        return;
      }
      setUploadingId(order.id);
      try {
        const response = await uploadTechnicianPhotos(order.id, Array.from(files));
        const normalized = normalizeTechnicianWorkOrder(response.workOrder);
        replaceOrder(normalized);
        emitToast('Photos uploaded.');
      } catch (err) {
        console.error(err);
        emitToast('Unable to upload photos.', 'error');
      } finally {
        setUploadingId(null);
      }
    },
    [replaceOrder],
  );

  const quickAction = (order: WorkOrder): { label: string; action: TechnicianStatePayload['action'] } | null => {
    switch (order.status) {
      case 'requested':
      case 'assigned':
        return { label: 'Start', action: 'start' };
      case 'in_progress':
        return { label: 'Pause', action: 'pause' };
      case 'paused':
        return { label: 'Resume', action: 'resume' };
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            Technician Console
          </h1>
          <p className="text-sm text-neutral-500">
            Manage assigned work orders and capture updates in the field.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void fetchAssignments()}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {isOffline && (
        <div className="flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-amber-700">
          <WifiOff className="h-4 w-4" /> You are offline. Changes will sync automatically.
        </div>
      )}

      {error && (
        <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="lg:w-2/5 space-y-3">
          {loading && (
            <div className="rounded-lg border border-dashed border-neutral-200 p-4 text-sm text-neutral-500">
              Loading work orders…
            </div>
          )}
          {!loading && workOrders.length === 0 && (
            <div className="rounded-lg border border-dashed border-neutral-200 p-4 text-sm text-neutral-500">
              No work orders are currently assigned to you.
            </div>
          )}
          {workOrders.map((order) => {
            const action = quickAction(order);
            return (
              <button
                key={order.id}
                type="button"
                onClick={() => setSelectedId(order.id)}
                className={`w-full rounded-lg border px-4 py-3 text-left transition hover:border-primary-500 ${
                  order.id === selectedId
                    ? 'border-primary-500 shadow-sm'
                    : 'border-neutral-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">
                      {order.title}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {order.asset?.name ?? 'Unlinked asset'}
                    </p>
                  </div>
                  <Badge text={order.status} type="status" size="sm" />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-neutral-500">
                  <span>Priority: {order.priority}</span>
                  {order.dueDate && (
                    <span>
                      Due {new Date(order.dueDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {action && (
                  <div className="mt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-2"
                      onClick={(event) => {
                        event.stopPropagation();
                        void applyAction(order, action.action);
                      }}
                      disabled={pendingAction === `${order.id}:${action.action}`}
                    >
                      {action.action === 'start' || action.action === 'resume' ? (
                        <PlayCircle className="h-4 w-4" />
                      ) : (
                        <PauseCircle className="h-4 w-4" />
                      )}
                      {pendingAction === `${order.id}:${action.action}` ? 'Working…' : action.label}
                    </Button>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex-1 rounded-lg border border-neutral-200 p-4">
          {!selectedOrder ? (
            <p className="text-sm text-neutral-500">
              Select a work order to view details.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                    {selectedOrder.title}
                  </h2>
                  <p className="text-sm text-neutral-500">
                    {selectedOrder.description || 'No description provided.'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge text={selectedOrder.status} type="status" size="sm" />
                  <Badge text={selectedOrder.priority} type="priority" size="sm" />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-neutral-200 p-3">
                  <p className="text-xs font-semibold text-neutral-500">Asset</p>
                  <p className="text-sm text-neutral-900 dark:text-neutral-100">
                    {selectedOrder.asset?.name ?? 'Unlinked asset'}
                  </p>
                </div>
                <div className="rounded-md border border-neutral-200 p-3">
                  <p className="text-xs font-semibold text-neutral-500">Time Logged</p>
                  <p className="text-sm text-neutral-900 dark:text-neutral-100">
                    {selectedOrder.timeSpentMin ?? 0} minutes
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-neutral-200 p-3">
                <p className="mb-2 text-sm font-semibold text-neutral-700">Log time</p>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-neutral-500" />
                    <input
                      type="number"
                      min={0}
                      className="w-24 rounded-md border border-neutral-200 px-2 py-1 text-sm"
                      placeholder="Minutes"
                      value={timeDrafts[selectedOrder.id] ?? ''}
                      onChange={(event) =>
                        setTimeDrafts((drafts) => ({
                          ...drafts,
                          [selectedOrder.id]: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1"
                    onClick={() => void applyAction(selectedOrder, 'log_time')}
                    disabled={pendingAction === `${selectedOrder.id}:log_time`}
                  >
                    <Clock3 className="h-4 w-4" />
                    {pendingAction === `${selectedOrder.id}:log_time` ? 'Saving…' : 'Log time'}
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-neutral-200 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-neutral-700">Parts used</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-1"
                    onClick={() => void handlePartSubmit(selectedOrder)}
                    disabled={pendingAction === `${selectedOrder.id}:parts`}
                  >
                    <PackagePlus className="h-4 w-4" />
                    {pendingAction === `${selectedOrder.id}:parts` ? 'Logging…' : 'Add part'}
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="flex-1 rounded-md border border-neutral-200 px-2 py-1 text-sm"
                    value={partDrafts[selectedOrder.id]?.partId ?? ''}
                    onChange={(event) =>
                      setPartDrafts((drafts) => ({
                        ...drafts,
                        [selectedOrder.id]: {
                          ...drafts[selectedOrder.id],
                          partId: event.target.value,
                        },
                      }))
                    }
                  >
                    <option value="">Select part</option>
                    {(partsQuery.data?.items ?? []).map((part) => (
                      <option key={part.id} value={part.id}>
                        {part.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    className="w-24 rounded-md border border-neutral-200 px-2 py-1 text-sm"
                    placeholder="Qty"
                    value={partDrafts[selectedOrder.id]?.qty ?? ''}
                    onChange={(event) =>
                      setPartDrafts((drafts) => ({
                        ...drafts,
                        [selectedOrder.id]: {
                          ...drafts[selectedOrder.id],
                          qty: Number(event.target.value),
                        },
                      }))
                    }
                  />
                </div>
                <ul className="space-y-1 text-sm text-neutral-600">
                  {(selectedOrder.partsUsed ?? []).map((entry) => {
                    const partName = entry.partId ? partLookup.get(entry.partId)?.name : undefined;
                    return (
                      <li key={`${entry.partId}-${entry.qty}`} className="flex items-center justify-between">
                        <span>{partName ?? entry.partId ?? 'Unknown part'}</span>
                        <span className="font-medium">× {entry.qty}</span>
                      </li>
                    );
                  })}
                  {(!selectedOrder.partsUsed || selectedOrder.partsUsed.length === 0) && (
                    <li className="text-xs text-neutral-500">No parts logged yet.</li>
                  )}
                </ul>
              </div>

              <div className="rounded-lg border border-neutral-200 p-3">
                <p className="mb-2 text-sm font-semibold text-neutral-700">Photos</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {(selectedOrder.photos ?? []).map((photo) => (
                    <img
                      key={photo}
                      src={photo}
                      alt="Work order attachment"
                      className="h-24 w-full rounded-md object-cover"
                    />
                  ))}
                  {(!selectedOrder.photos || selectedOrder.photos.length === 0) && (
                    <p className="col-span-full text-xs text-neutral-500">No photos captured.</p>
                  )}
                </div>
                <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm text-primary-600">
                  <ImagePlus className="h-4 w-4" />
                  <span>{uploadingId === selectedOrder.id ? 'Uploading…' : 'Add photos'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(event) => {
                      void handleAttachmentUpload(selectedOrder, event.target.files);
                      event.target.value = '';
                    }}
                    disabled={uploadingId === selectedOrder.id}
                  />
                </label>
              </div>

              <div className="flex flex-wrap gap-2">
                {['start', 'pause', 'resume', 'complete'].map((action) => {
                  const allowed =
                    (action === 'start' && ['requested', 'assigned'].includes(selectedOrder.status)) ||
                    (action === 'pause' && selectedOrder.status === 'in_progress') ||
                    (action === 'resume' && selectedOrder.status === 'paused') ||
                    (action === 'complete' && ['in_progress', 'paused'].includes(selectedOrder.status));
                  if (!allowed) return null;
                  const label =
                    action === 'start'
                      ? 'Start'
                      : action === 'pause'
                        ? 'Pause'
                        : action === 'resume'
                          ? 'Resume'
                          : 'Complete';
                  const Icon =
                    action === 'complete'
                      ? CheckCircle2
                      : action === 'pause'
                        ? PauseCircle
                        : PlayCircle;
                  return (
                    <Button
                      key={action}
                      size="sm"
                      variant={action === 'complete' ? 'primary' : 'outline'}
                      className="flex items-center gap-2"
                      onClick={() => void applyAction(selectedOrder, action as TechnicianStatePayload['action'])}
                      disabled={pendingAction === `${selectedOrder.id}:${action}`}
                    >
                      <Icon className="h-4 w-4" />
                      {pendingAction === `${selectedOrder.id}:${action}` ? 'Working…' : label}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TechnicianWorkspace;
