/*
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRightCircle,
  Check,
  Download,
  Fingerprint,
  Home,
  Radio,
  ScanLine,
  ShieldCheck,
  Wifi,
  WifiOff,
} from 'lucide-react';

import { fetchTechnicianWorkOrders, normalizeTechnicianWorkOrder } from '@/api/technician';
import Button from '@/components/common/Button';
import Badge from '@/components/common/Badge';
import QrScanner from '@/components/qr/QrScanner';
import { useSyncStore } from '@/store/syncStore';
import { cacheWorkOrders, getCachedWorkOrders } from '@/store/dataStore';
import { addToQueue, loadQueue, onQueueChange } from '@/utils/offlineQueue';
import { retryFailedRequests } from '@/utils/offlineQueue';
import { syncManager } from '@/utils/syncManager';
import PwaCapturePad from '@/features/technician/PwaCapturePad';
import { registerSWIfAvailable } from '@/pwa';
import {
  confirmEntityExists,
  logScanNavigationOutcome,
  recordScanHistory,
  resolveScanValue,
} from '@/utils/scanRouting';
import type { WorkOrder } from '@/types';
import http from '@/lib/http';
import { authenticateBiometric, isNativeShell } from '@/utils/secureAuthStorage';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const PwaTechnicianShell: React.FC = () => {
  const [cachedOrders, setCachedOrders] = useState<WorkOrder[]>([]);
  const [queueSize, setQueueSize] = useState(loadQueue().length);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [detectedWorkOrder, setDetectedWorkOrder] = useState<WorkOrder | null>(null);
  const [detectedAssetId, setDetectedAssetId] = useState<string | null>(null);
  const [warmingCache, setWarmingCache] = useState(false);
  const [locked, setLocked] = useState(isNativeShell());
  const [unlocking, setUnlocking] = useState(false);
  const syncState = useSyncStore();
  const cacheWarmTimeout = useRef<ReturnType<typeof setTimeout>>();

  const offline = syncState.offline;

  useEffect(() => {
    registerSWIfAvailable({ immediate: true }).catch(() => {
      // ignore registration errors in dev
    });
    syncManager.init();
    const unsubscribeQueue = onQueueChange((size) => setQueueSize(size));
    return () => {
      syncManager.teardown();
      unsubscribeQueue();
      if (cacheWarmTimeout.current) clearTimeout(cacheWarmTimeout.current);
    };
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    void loadCachedAssignments();
  }, []);

  const loadCachedAssignments = async () => {
    const cached = (await getCachedWorkOrders()) as WorkOrder[];
    setCachedOrders(cached);
  };

  const refreshAssignments = async () => {
    try {
      const response = await fetchTechnicianWorkOrders();
      const normalized = response.map((item) => normalizeTechnicianWorkOrder(item));
      setCachedOrders(normalized);
      await cacheWorkOrders(normalized);
      setLastMessage('Cached the latest assignments for offline use.');
    } catch {
      setLastMessage('Unable to refresh from the network; showing cached assignments.');
      await loadCachedAssignments();
    }
  };

  const requestInstall = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  };

  const warmOfflineCaches = async () => {
    setWarmingCache(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      registration.active?.postMessage({
        type: 'CACHE_OFFLINE_DATA',
        payload: { urls: ['/api/workorders/offline', '/api/pm/offline', '/api/assets'] },
      });
      cacheWarmTimeout.current = setTimeout(() => setWarmingCache(false), 1200);
      setLastMessage('Requested offline cache for work orders, PM tasks, and assets.');
    } catch (err) {
      console.error(err);
      setLastMessage('Unable to talk to the service worker to cache data.');
      setWarmingCache(false);
    }
  };

  const handleScan = async (raw: string) => {
    const resolution = await resolveScanValue(raw);
    setScanResult(raw);
    setDetectedAssetId(null);
    setDetectedWorkOrder(null);

    if ('error' in resolution) {
      setLastMessage(resolution.error);
      logScanNavigationOutcome({ outcome: 'failure', error: resolution.error, source: 'pwa-shell' });
      void recordScanHistory({ outcome: 'failure', error: resolution.error, rawValue: raw, source: 'pwa-shell' });
      return;
    }

    const exists = await confirmEntityExists(resolution, { cachedWorkOrders: cachedOrders });
    if (!exists) {
      setLastMessage('Entity not found online; check connectivity or rescan.');
      logScanNavigationOutcome({ outcome: 'failure', resolution, error: 'Entity not found', source: 'pwa-shell' });
      void recordScanHistory({
        outcome: 'failure',
        error: 'Entity not found',
        rawValue: raw,
        resolution,
        source: 'pwa-shell',
      });
      return;
    }

    logScanNavigationOutcome({ outcome: 'success', resolution, source: 'pwa-shell' });
    void recordScanHistory({ outcome: 'success', rawValue: raw, resolution, source: 'pwa-shell' });

    if (resolution.type === 'workOrder') {
      const fromCache = cachedOrders.find((order) => order.id === resolution.id);
      if (fromCache) setDetectedWorkOrder(fromCache);
      try {
        const response = await http.get(`/workorders/${resolution.id}`);
        setDetectedWorkOrder(response.data as WorkOrder);
        setLastMessage('Found work order from scan.');
      } catch {
        setLastMessage('Work order not found online; using cached data when available.');
      }
      return;
    }

    if (resolution.type === 'asset') {
      setDetectedAssetId(resolution.id);
      setLastMessage('Asset located; open from the asset page.');
    }

    if (resolution.type === 'location' || resolution.type === 'part') {
      setLastMessage('Scan resolved to an inventory record; open the web app for full details.');
    }
  };

  const checkInFromScan = () => {
    if (!detectedAssetId && !detectedWorkOrder?.id) return;
    const entityId = detectedWorkOrder?.id ?? detectedAssetId ?? 'unknown';
    addToQueue({
      method: 'post',
      url: detectedWorkOrder ? `/workorders/${entityId}/check-in` : `/assets/${entityId}/check-in`,
      data: { scannedAt: Date.now(), source: 'pwa-shell' },
      meta: { entityType: detectedWorkOrder ? 'workorder' : 'asset', entityId },
    });
    setQueueSize(loadQueue().length);
    setLastMessage('Check-in queued for sync.');
  };

  const queueAnnotatedNote = (payload: { image: string | null; note: string }) => {
    addToQueue({
      method: 'post',
      url: '/offline/notes',
      data: { ...payload, createdAt: Date.now(), workOrderId: detectedWorkOrder?.id ?? null },
      meta: { entityType: 'workorder', entityId: detectedWorkOrder?.id },
    });
    setQueueSize(loadQueue().length);
    setLastMessage('Saved note to offline queue.');
  };

  const queueStatus = useMemo(() => {
    if (syncState.status === 'syncing') return 'Syncing offline updates…';
    if (syncState.status === 'conflicted') return 'Conflicts need review.';
    if (queueSize > 0) return `${queueSize} change(s) waiting to sync.`;
    return 'All caught up.';
  }, [queueSize, syncState.status]);

  const syncHealth = useMemo(() => {
    const statuses = Object.values(syncState.itemStatuses);
    const pending = statuses.filter((status) => status === 'pending' || status === 'retrying').length;
    const synced = statuses.filter((status) => status === 'synced').length;
    const failed = statuses.filter((status) => status === 'failed').length;
    return { pending, synced, failed };
  }, [syncState.itemStatuses]);

  const unlockMobile = async () => {
    setUnlocking(true);
    try {
      const ok = await authenticateBiometric('Unlock WorkPro mobile shell');
      if (ok) {
        setLocked(false);
        setLastMessage('Biometric unlock successful.');
      } else {
        setLastMessage('Biometric unlock failed.');
      }
    } catch (error) {
      console.error(error);
      setLastMessage('Unable to perform biometric unlock.');
    } finally {
      setUnlocking(false);
    }
  };

  const retryFailedNow = async () => {
    retryFailedRequests();
    setQueueSize(loadQueue().length);
    setLastMessage('Failed sync items were re-queued for retry.');
    await syncManager.sync();
  };

  if (locked) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] p-6 text-center">
          <h2 className="text-xl font-semibold text-[var(--wp-color-text)]">Mobile unlock required</h2>
          <p className="mt-2 text-sm text-[var(--wp-color-text-muted)]">
            Biometric unlock protects technician sessions on native mobile builds.
          </p>
          <div className="mt-4">
            <Button onClick={() => void unlockMobile()} disabled={unlocking}>
              {unlocking ? 'Unlocking...' : 'Unlock with biometrics'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4 md:p-6">
      <header className="space-y-2 rounded-2xl bg-gradient-to-r from-primary-900 via-primary-800 to-primary-600 px-5 py-6 text-[var(--wp-color-text)] shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary-200">PWA shell</p>
            <h1 className="text-2xl font-bold">Technician mobile workspace</h1>
            <p className="max-w-2xl text-sm text-primary-100">
              Touch-first dashboard with offline cache, QR check-ins, photo markup, and install-ready service worker.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge text={offline ? 'Offline' : 'Online'} type={offline ? 'error' : 'success'} />
            <Badge text={queueStatus} type="status" />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => void refreshAssignments()} className="flex items-center gap-2 text-[var(--wp-color-text)]">
            <Download className="h-4 w-4" /> Refresh & cache WOs
          </Button>
          <Button size="sm" variant="ghost" onClick={() => void syncManager.sync()} className="flex items-center gap-2 text-[var(--wp-color-text)]/90">
            <Radio className="h-4 w-4" /> Sync now
          </Button>
          <Button size="sm" variant="ghost" onClick={warmOfflineCaches} disabled={warmingCache} className="flex items-center gap-2 text-[var(--wp-color-text)]/90">
            <ShieldCheck className="h-4 w-4" /> {warmingCache ? 'Caching…' : 'Cache PM / assets'}
          </Button>
          {installEvent && (
            <Button size="sm" onClick={() => void requestInstall()} className="flex items-center gap-2">
              <Home className="h-4 w-4" /> Install app
            </Button>
          )}
        </div>
      </header>

      {lastMessage && (
        <div className="flex items-start gap-2 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm text-primary-900 dark:border-primary-900/30 dark:bg-primary-900/40 dark:text-primary-50">
          <AlertTriangle className="mt-0.5 h-4 w-4" />
          <span>{lastMessage}</span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="space-y-3 rounded-xl border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)]/80 p-4 shadow-sm dark:border-[var(--wp-color-border)] dark:bg-[color-mix(in_srgb,var(--wp-color-surface)_70%,transparent)] lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-primary-500">Camera</p>
              <h2 className="text-lg font-semibold text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">QR / barcode scan for assets & WOs</h2>
            </div>
            <Badge text={scanResult ? 'Scan detected' : 'Waiting…'} type={scanResult ? 'success' : 'info'} />
          </div>
          <QrScanner onDetected={handleScan} onError={(message) => setLastMessage(message ?? 'Camera error')} />
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)]/70 p-3 dark:border-[var(--wp-color-border)] dark:bg-[color-mix(in_srgb,var(--wp-color-surface)_65%,transparent)]">
              <p className="text-xs font-semibold text-[var(--wp-color-text-muted)] dark:text-[var(--wp-color-text-muted)]">Detected asset</p>
              <p className="text-sm text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">{detectedAssetId ?? '—'}</p>
              <Button size="sm" variant="ghost" className="mt-2 flex items-center gap-2" onClick={checkInFromScan}>
                <Fingerprint className="h-4 w-4" /> Queue check-in
              </Button>
            </div>
            <div className="rounded-lg border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)]/70 p-3 dark:border-[var(--wp-color-border)] dark:bg-[color-mix(in_srgb,var(--wp-color-surface)_65%,transparent)]">
              <p className="text-xs font-semibold text-[var(--wp-color-text-muted)] dark:text-[var(--wp-color-text-muted)]">Detected work order</p>
              {detectedWorkOrder ? (
                <div className="space-y-1 text-sm text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">
                  <p className="font-semibold">{detectedWorkOrder.title}</p>
                  <p className="text-xs text-[var(--wp-color-text-muted)]">Status: {detectedWorkOrder.status}</p>
                  <p className="text-xs text-[var(--wp-color-text-muted)]">Priority: {detectedWorkOrder.priority}</p>
                </div>
              ) : (
                <p className="text-sm text-[var(--wp-color-text-muted)]">—</p>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-3 rounded-xl border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)]/80 p-4 shadow-sm dark:border-[var(--wp-color-border)] dark:bg-[color-mix(in_srgb,var(--wp-color-surface)_70%,transparent)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-primary-500">Sync state</p>
              <h3 className="text-lg font-semibold text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">Offline queue</h3>
            </div>
            <Badge text={`${queueSize} queued`} type={queueSize > 0 ? 'warning' : 'success'} />
          </div>
          <div className="space-y-2 text-sm text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">
            <p className="flex items-center gap-2">
              {offline ? <WifiOff className="h-4 w-4" /> : <Wifi className="h-4 w-4" />} {offline ? 'Offline' : 'Online'}
            </p>
            <p className="flex items-center gap-2">
              <Radio className="h-4 w-4" /> {queueStatus}
            </p>
            {syncState.conflict && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-100">
                <p className="font-semibold">Conflict on {syncState.conflict.url}</p>
                <p>Review server vs local changes before retrying.</p>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2 rounded-lg border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)]/70 p-2 text-xs">
              <div>
                <p className="text-[var(--wp-color-text-muted)]">Pending</p>
                <p className="font-semibold text-[var(--wp-color-text)]">{syncHealth.pending}</p>
              </div>
              <div>
                <p className="text-[var(--wp-color-text-muted)]">Synced</p>
                <p className="font-semibold text-[var(--wp-color-text)]">{syncHealth.synced}</p>
              </div>
              <div>
                <p className="text-[var(--wp-color-text-muted)]">Failed</p>
                <p className="font-semibold text-[var(--wp-color-text)]">{syncHealth.failed}</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => void retryFailedNow()}>
              Retry failed now
            </Button>
          </div>
          <div className="rounded-lg border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)]/70 p-3 text-sm dark:border-[var(--wp-color-border)] dark:bg-[color-mix(in_srgb,var(--wp-color-surface)_70%,transparent)]">
            <p className="text-xs font-semibold text-[var(--wp-color-text-muted)] dark:text-[var(--wp-color-text-muted)]">Cached work orders</p>
            <ul className="mt-2 space-y-2">
              {cachedOrders.slice(0, 3).map((order) => (
                <li key={order.id} className="flex items-center justify-between rounded-md bg-[var(--wp-color-surface)]/80 px-3 py-2 text-xs shadow-sm dark:bg-[color-mix(in_srgb,var(--wp-color-background)_70%,transparent)]">
                  <div>
                    <p className="font-semibold text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">{order.title}</p>
                    <p className="text-[var(--wp-color-text-muted)]">{order.asset?.name ?? 'Unlinked asset'}</p>
                  </div>
                  <Badge text={order.status} type="status" size="sm" />
                </li>
              ))}
              {cachedOrders.length === 0 && <li className="text-xs text-[var(--wp-color-text-muted)]">No cached assignments yet.</li>}
            </ul>
          </div>
        </section>
      </div>

      <section className="space-y-3 rounded-xl border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)]/80 p-4 shadow-sm dark:border-[var(--wp-color-border)] dark:bg-[color-mix(in_srgb,var(--wp-color-surface)_70%,transparent)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-primary-500">Touch cards</p>
            <h3 className="text-lg font-semibold text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">Tap-friendly technician shortcuts</h3>
          </div>
          <Badge text="Packaged for offline" type="success" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[{ title: 'Assignments', description: 'Work offline from cached WOs.', icon: Download },
            { title: 'Start job', description: 'Check in from a scan.', icon: ScanLine },
            { title: 'Mark complete', description: 'Queue completion for sync.', icon: Check },
            { title: 'Navigate asset', description: 'Open asset details in one tap.', icon: ArrowRightCircle },
          ].map((card) => (
            <div key={card.title} className="rounded-xl border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)]/80 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary-400 dark:border-[var(--wp-color-border)] dark:bg-[color-mix(in_srgb,var(--wp-color-surface)_70%,transparent)]">
              <div className="flex items-center gap-2 text-primary-600 dark:text-primary-300">
                <card.icon className="h-4 w-4" />
                <p className="text-xs font-semibold uppercase tracking-wide">{card.title}</p>
              </div>
              <p className="mt-2 text-sm text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">{card.description}</p>
            </div>
          ))}
        </div>
      </section>

      <PwaCapturePad onSave={queueAnnotatedNote} />
    </div>
  );
};

export default PwaTechnicianShell;

