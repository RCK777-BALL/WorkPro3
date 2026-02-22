/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import http from '@/lib/http';
import BarcodeScanner from '@/components/mobile/BarcodeScanner';
import { emitToast } from '@/context/ToastContext';
import { enqueueWorkOrderUpdate, addToQueue } from '@/utils/offlineQueue';
import { safeLocalStorage } from '@/utils/safeLocalStorage';
import type { WorkOrder } from '@/types';

interface WorkOrderResponse extends Partial<WorkOrder> {
  _id?: string;
  id?: string;
  updatedAt?: string;
}

interface DeferredMedia {
  name: string;
  type: string;
  dataUrl: string;
  capturedAt: number;
}

const CACHE_PREFIX = 'mobile-workorder-cache:';

const normalize = (data: WorkOrderResponse): WorkOrder | null => {
  const id = data._id ?? data.id;
  if (!id) return null;
  return {
    id,
    title: data.title ?? 'Work order',
    status: data.status ?? 'requested',
    priority: data.priority ?? 'medium',
    type: data.type ?? 'corrective',
    description: data.description,
    assetId: data.assetId,
    asset: data.asset,
    department: data.department ?? '',
  } as WorkOrder;
};

const MobileWorkOrder = () => {
  const { id } = useParams<{ id: string }>();
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [checklist, setChecklist] = useState<string[]>([]);
  const [pendingMedia, setPendingMedia] = useState<DeferredMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [serverVersion, setServerVersion] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const cached = safeLocalStorage.getItem(`${CACHE_PREFIX}${id}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as { workOrder: WorkOrder; checklist: string[]; updatedAt?: string };
        setWorkOrder(parsed.workOrder);
        setChecklist(parsed.checklist ?? []);
        setServerVersion(parsed.updatedAt ?? null);
      } catch {
        /* ignore bad cache */
      }
    }
  }, [id]);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const res = await http.get<WorkOrderResponse>(`/workorders/${id}`);
        const normalized = normalize(res.data);
        setWorkOrder(normalized);
        setError(null);
        const cachePayload = {
          workOrder: normalized,
          checklist: Array.isArray(res.data.checklists)
            ? res.data.checklists.map((item) => String(item))
            : checklist,
          updatedAt: res.data.updatedAt ?? null,
        };
        safeLocalStorage.setItem(`${CACHE_PREFIX}${id}`, JSON.stringify(cachePayload));
        setServerVersion(res.data.updatedAt ?? null);
        setChecklist(
          Array.isArray(res.data.checklists)
            ? res.data.checklists.map((item) => String(item))
            : checklist
        );
      } catch (err) {
        console.error(err);
        setError('Working offline; showing cached work order.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id]);

  const header = useMemo(() => {
    if (loading) return 'Loading worker view...';
    if (error) return error;
    if (!workOrder) return 'No work order available.';
    return null;
  }, [loading, error, workOrder]);

  const handleStatus = async (status: string) => {
    if (!id) return;
    const payload = { status, checklist };
    if (navigator.onLine) {
      await http.put(`/workorders/${id}`, payload);
    } else {
      enqueueWorkOrderUpdate(id, payload);
      emitToast('Saved update for background sync', 'success');
    }
  };

  const handleMediaCapture = async (files: FileList | null) => {
    if (!files) return;
    const readers = Array.from(files).map(
      (file) =>
        new Promise<DeferredMedia>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () =>
            resolve({
              name: file.name,
              type: file.type,
              dataUrl: String(reader.result),
              capturedAt: Date.now(),
            });
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        })
    );
    try {
      const media = await Promise.all(readers);
      setPendingMedia((prev) => [...prev, ...media]);
      emitToast('Captured media and queued for upload', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to capture media';
      emitToast(message, 'error');
    }
  };

  const flushMedia = async () => {
    if (!id || pendingMedia.length === 0) return;
    const payload = { media: pendingMedia };
    if (navigator.onLine) {
      await http.post(`/workorders/${id}/media`, payload);
      setPendingMedia([]);
      emitToast('Uploaded media', 'success');
    } else {
      addToQueue({ method: 'post', url: `/workorders/${id}/media`, data: payload });
      setPendingMedia([]);
      emitToast('Media queued for background upload', 'success');
    }
  };

  const handleScan = (value: string) => {
    setScannedCode(value);
    if (id) {
      addToQueue({
        method: 'post',
        url: `/workorders/${id}/tags`,
        data: { tag: value, source: 'barcode' },
        meta: { entityType: 'workorder', entityId: id },
      });
      emitToast('Tagged work order for sync', 'success');
    }
  };

  const conflictWarning = useMemo(() => {
    if (!serverVersion) return null;
    const cachedVersion = safeLocalStorage.getItem(`${CACHE_PREFIX}${id}:version`);
    if (cachedVersion && cachedVersion !== serverVersion) {
      return 'Server version changed while offline. Review before syncing new updates.';
    }
    if (serverVersion) {
      safeLocalStorage.setItem(`${CACHE_PREFIX}${id}:version`, serverVersion);
    }
    return null;
  }, [serverVersion, id]);

  useEffect(() => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') return;
    void Notification.requestPermission();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--wp-color-surface-elevated)] text-[var(--wp-color-text)]">
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-xs uppercase text-[var(--wp-color-primary)]">Worker Mode</p>
          <h1 className="text-2xl font-semibold">{workOrder?.title ?? 'Work order'}</h1>
          {header && <p className="text-sm text-[var(--wp-color-text-muted)]">{header}</p>}
          {conflictWarning && <p className="text-sm text-amber-300">{conflictWarning}</p>}
        </div>
        <Link to="/workorders" className="text-sm text-[var(--wp-color-primary)] underline">
          Back
        </Link>
      </div>

      <div className="space-y-4 px-4 pb-10">
        <section className="rounded-2xl border border-[var(--wp-color-border)] bg-[color-mix(in_srgb,var(--wp-color-surface)_60%,transparent)] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--wp-color-text-muted)]">Status</p>
              <p className="text-lg font-semibold">{workOrder?.status ?? 'offline'}</p>
            </div>
            <div className="flex gap-2">
              <button
                className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold"
                onClick={() => void handleStatus('in_progress')}
              >
                Start
              </button>
              <button
                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold"
                onClick={() => void handleStatus('completed')}
              >
                Complete
              </button>
            </div>
          </div>
        </section>

        <section className="space-y-2 rounded-2xl border border-[var(--wp-color-border)] bg-[color-mix(in_srgb,var(--wp-color-surface)_60%,transparent)] p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Checklist</p>
            <button
              className="text-sm text-[var(--wp-color-primary)]"
              onClick={() => setChecklist((prev) => [...prev, `Step ${prev.length + 1}`])}
            >
              Add item
            </button>
          </div>
          <ul className="space-y-2">
            {checklist.map((item, idx) => (
              <li key={idx} className="flex items-center gap-3 rounded-lg bg-[var(--wp-color-surface-elevated)]/70 p-2">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  onChange={(e) => {
                    const next = [...checklist];
                    next[idx] = e.target.checked ? `${item} ✅` : item.replace(' ✅', '');
                    setChecklist(next);
                  }}
                />
                <span className="text-sm">{item}</span>
              </li>
            ))}
          </ul>
          <button
            className="w-full rounded-lg border border-[var(--wp-color-border)] px-3 py-2 text-sm"
            onClick={() => void handleStatus(workOrder?.status ?? 'requested')}
          >
            Sync checklist
          </button>
        </section>

        <section className="space-y-3 rounded-2xl border border-[var(--wp-color-border)] bg-[color-mix(in_srgb,var(--wp-color-surface)_60%,transparent)] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Barcode / QR</p>
              {scannedCode && <p className="text-xs text-[var(--wp-color-text-muted)]">Last scan: {scannedCode}</p>}
            </div>
            <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs text-[var(--wp-color-primary)]">Camera</span>
          </div>
          <BarcodeScanner onDetected={handleScan} />
        </section>

        <section className="space-y-3 rounded-2xl border border-[var(--wp-color-border)] bg-[color-mix(in_srgb,var(--wp-color-surface)_60%,transparent)] p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Offline media</p>
            <span className="text-xs text-[var(--wp-color-text-muted)]">{pendingMedia.length} queued</span>
          </div>
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            capture="environment"
            className="w-full rounded-lg border border-[var(--wp-color-border)] bg-[var(--wp-color-surface-elevated)] px-3 py-2 text-sm"
            onChange={(e) => void handleMediaCapture(e.target.files)}
          />
          <button
            className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold"
            onClick={() => void flushMedia()}
            disabled={pendingMedia.length === 0}
          >
            Upload queued media
          </button>
        </section>
      </div>
    </div>
  );
};

export default MobileWorkOrder;

