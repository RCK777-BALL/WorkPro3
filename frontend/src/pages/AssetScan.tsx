/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import { AlertTriangle, ClipboardList, Scan, Wand2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { usePermissions } from '@/auth/usePermissions';
import ScanPanel from '@/components/scan/ScanPanel';
import WorkOrderModal from '@/components/work-orders/WorkOrderModal';
import http from '@/lib/http';
import {
  confirmEntityExists,
  logScanNavigationOutcome,
  recordScanHistory,
  resolveScanValue,
  type ScanResolution,
} from '@/utils/scanRouting';
import type { WorkOrder } from '@/types';

const AssetScan: React.FC = () => {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const [scanError, setScanError] = React.useState<string | null>(null);
  const [workOrderDefaults, setWorkOrderDefaults] = React.useState<Partial<WorkOrder> | null>(null);
  const [showWorkOrder, setShowWorkOrder] = React.useState(false);

  const canCreateWorkOrders = can('workRequests', 'convert');

  const handleCreateWorkOrder = async (payload: FormData | Record<string, unknown>) => {
    try {
      if (payload instanceof FormData) {
        await http.post('/workorders', payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await http.post('/workorders', payload);
      }
    } catch (err) {
      console.error('Failed to create work order from scan', err);
    } finally {
      setShowWorkOrder(false);
    }
  };

  const handleScan = async (rawValue: string) => {
    setScanError(null);
    const parsed = await resolveScanValue(rawValue);

    if ('error' in parsed) {
      setScanError(parsed.error);
      logScanNavigationOutcome({ outcome: 'failure', error: parsed.error, source: 'asset-scan' });
      void recordScanHistory({ outcome: 'failure', error: parsed.error, rawValue, source: 'asset-scan' });
      if (canCreateWorkOrders) {
        setWorkOrderDefaults({
          title: 'Work order from QR scan',
          description: `Scanned value: ${rawValue}`,
        });
        setShowWorkOrder(true);
      }
      return;
    }

    const resolution: ScanResolution = parsed;
    if (resolution.type !== 'asset') {
      setScanError('This QR code does not reference an asset.');
      logScanNavigationOutcome({
        outcome: 'failure',
        resolution,
        error: 'Unsupported scan type for this tool',
        source: 'asset-scan',
      });
      void recordScanHistory({
        outcome: 'failure',
        error: 'Unsupported scan type for this tool',
        rawValue,
        resolution,
        source: 'asset-scan',
      });
      return;
    }

    const exists = await confirmEntityExists(resolution);
    if (!exists) {
      const detail = 'No matching asset was found. You can still open a work order from this scan.';
      setScanError(detail);
      logScanNavigationOutcome({ outcome: 'failure', resolution, error: detail, source: 'asset-scan' });
      void recordScanHistory({
        outcome: 'failure',
        error: detail,
        rawValue,
        resolution,
        source: 'asset-scan',
      });
      if (canCreateWorkOrders) {
        setWorkOrderDefaults({
          assetId: resolution.id,
          title: 'Work order from QR scan',
          description: `Reported via QR scan for asset ${resolution.id}.`,
        });
        setShowWorkOrder(true);
      }
      return;
    }

    logScanNavigationOutcome({ outcome: 'success', resolution, source: 'asset-scan' });
    void recordScanHistory({ outcome: 'success', rawValue, resolution, source: 'asset-scan' });
    navigate(resolution.path);
  };

  return (
    <div className="space-y-6 p-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-primary-500">QR scanning</p>
        <h1 className="text-3xl font-bold text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">Scan asset QR code</h1>
        <p className="text-sm text-[var(--wp-color-text-muted)] dark:text-[var(--wp-color-text-muted)]">
          Use your device camera to jump directly to an asset or open a corrective work order when issues are spotted on the floor.
        </p>
      </header>

      {!canCreateWorkOrders && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100" role="alert">
          <AlertTriangle className="h-4 w-4 mt-0.5" />
          <div>
            <p className="font-semibold">Work order creation is restricted.</p>
            <p>You can still scan and view assets, but you need additional permissions to open work orders from a scan.</p>
          </div>
        </div>
      )}

      <ScanPanel title="Scan asset QR code" onDetected={handleScan} onError={setScanError} />

      {scanError && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100" role="status">
          <AlertTriangle className="h-4 w-4 mt-0.5" />
          <div>
            <p className="font-semibold">Scan result</p>
            <p>{scanError}</p>
          </div>
        </div>
      )}

      <div className="grid gap-4 rounded-xl border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] p-4 shadow-sm dark:border-[var(--wp-color-border)] dark:bg-[color-mix(in_srgb,var(--wp-color-surface)_70%,transparent)] md:grid-cols-3">
        <div className="flex items-start gap-3">
          <div className="mt-1 rounded-full bg-primary-100 p-2 text-primary-700 dark:bg-primary-900/50 dark:text-primary-200">
            <Scan className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">Point and capture</p>
            <p className="text-sm text-[var(--wp-color-text-muted)] dark:text-[var(--wp-color-text-muted)]">The scanner uses your browser camera and works offline-friendly when cached.</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="mt-1 rounded-full bg-primary-100 p-2 text-primary-700 dark:bg-primary-900/50 dark:text-primary-200">
            <Wand2 className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">Navigate instantly</p>
            <p className="text-sm text-[var(--wp-color-text-muted)] dark:text-[var(--wp-color-text-muted)]">Valid asset codes open the asset page so technicians can review context right away.</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="mt-1 rounded-full bg-primary-100 p-2 text-primary-700 dark:bg-primary-900/50 dark:text-primary-200">
            <ClipboardList className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">Raise work orders</p>
            <p className="text-sm text-[var(--wp-color-text-muted)] dark:text-[var(--wp-color-text-muted)]">If an asset is missing or failing, open a corrective work order directly from the scan.</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-sm text-[var(--wp-color-text-muted)] dark:text-[var(--wp-color-text-muted)]">
        <span className="font-semibold">Need to scan again?</span>
        <span>Tap the retry button to request camera access or refresh the page if your browser revoked the permission.</span>
      </div>

      <WorkOrderModal
        isOpen={showWorkOrder}
        onClose={() => setShowWorkOrder(false)}
        workOrder={null}
        initialData={workOrderDefaults ?? undefined}
        onUpdate={handleCreateWorkOrder}
      />
    </div>
  );
};

export default AssetScan;

