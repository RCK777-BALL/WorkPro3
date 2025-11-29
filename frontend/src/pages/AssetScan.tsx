/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import { AlertTriangle, ClipboardList, Scan, Wand2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { usePermissions } from '@/auth/usePermissions';
import QrScanner from '@/components/qr/QrScanner';
import WorkOrderModal from '@/components/work-orders/WorkOrderModal';
import http from '@/lib/http';
import type { WorkOrder } from '@/types';

const parseScanValue = (raw: string): { assetId?: string; raw: string } => {
  try {
    const parsed = JSON.parse(raw) as { id?: string; assetId?: string; type?: string };
    if (parsed.type === 'asset' && parsed.id) {
      return { assetId: parsed.id, raw };
    }
    if (parsed.assetId || parsed.id) {
      return { assetId: parsed.assetId ?? parsed.id, raw };
    }
  } catch (err) {
    // not JSON
  }
  return { assetId: raw.trim() || undefined, raw };
};

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
    const { assetId } = parseScanValue(rawValue);
    setScanError(null);

    if (!assetId) {
      setScanError('The QR code did not include an asset id.');
      if (canCreateWorkOrders) {
        setWorkOrderDefaults({
          title: 'Work order from QR scan',
          description: `Scanned value: ${rawValue}`,
        });
        setShowWorkOrder(true);
      }
      return;
    }

    try {
      await http.get(`/assets/${assetId}`);
      navigate(`/assets/${assetId}`);
    } catch (err) {
      console.warn('Asset lookup failed for scanned value', err);
      setScanError('No matching asset was found. You can still open a work order from this scan.');
      if (canCreateWorkOrders) {
        setWorkOrderDefaults({
          assetId,
          title: 'Work order from QR scan',
          description: `Reported via QR scan for asset ${assetId}.`,
        });
        setShowWorkOrder(true);
      }
    }
  };

  return (
    <div className="space-y-6 p-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-primary-500">QR scanning</p>
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">Scan asset QR code</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
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

      <QrScanner onDetected={handleScan} onError={setScanError} />

      {scanError && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100" role="status">
          <AlertTriangle className="h-4 w-4 mt-0.5" />
          <div>
            <p className="font-semibold">Scan result</p>
            <p>{scanError}</p>
          </div>
        </div>
      )}

      <div className="grid gap-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/60 md:grid-cols-3">
        <div className="flex items-start gap-3">
          <div className="mt-1 rounded-full bg-primary-100 p-2 text-primary-700 dark:bg-primary-900/50 dark:text-primary-200">
            <Scan className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-neutral-900 dark:text-neutral-50">Point and capture</p>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">The scanner uses your browser camera and works offline-friendly when cached.</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="mt-1 rounded-full bg-primary-100 p-2 text-primary-700 dark:bg-primary-900/50 dark:text-primary-200">
            <Wand2 className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-neutral-900 dark:text-neutral-50">Navigate instantly</p>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">Valid asset codes open the asset page so technicians can review context right away.</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="mt-1 rounded-full bg-primary-100 p-2 text-primary-700 dark:bg-primary-900/50 dark:text-primary-200">
            <ClipboardList className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-neutral-900 dark:text-neutral-50">Raise work orders</p>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">If an asset is missing or failing, open a corrective work order directly from the scan.</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-sm text-neutral-600 dark:text-neutral-300">
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
