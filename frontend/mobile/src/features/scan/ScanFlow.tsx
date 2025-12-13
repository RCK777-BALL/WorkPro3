/*
 * SPDX-License-Identifier: MIT
 */

import { useState } from 'react';
import { useScanWorkflow } from './useScanWorkflow';

export const ScanFlow = () => {
  const [qrValue, setQrValue] = useState('');
  const [title, setTitle] = useState('Mobile work order');
  const [description, setDescription] = useState('');
  const {
    step,
    asset,
    error,
    workOrderId,
    recentScans,
    historyError,
    isLoadingHistory,
    startFromQr,
    createWorkOrder,
    completeWorkOrder,
    reloadHistory,
    reopenScan,
  } = useScanWorkflow();

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">QR Scan Workflow</h2>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {step === 'scan' && (
        <div className="space-y-2">
          <label className="block text-sm font-medium">Paste QR code value</label>
          <textarea
            value={qrValue}
            onChange={(event) => setQrValue(event.target.value)}
            rows={3}
            className="w-full rounded border border-neutral-300 p-2 text-sm"
            placeholder="{"type":"asset","id":"..."}"
          />
          <button className="rounded bg-blue-600 px-3 py-2 text-sm text-white" onClick={() => startFromQr(qrValue)}>
            Decode QR
          </button>
        </div>
      )}

      <div className="space-y-2 rounded-lg border border-neutral-200 p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-neutral-900">Recent scans</p>
          <button
            className="text-xs font-semibold text-blue-700"
            onClick={() => reloadHistory()}
            type="button"
          >
            Refresh
          </button>
        </div>
        {historyError && <p className="text-xs text-red-600">{historyError}</p>}
        {isLoadingHistory ? (
          <p className="text-sm text-neutral-600">Loading…</p>
        ) : recentScans.length === 0 ? (
          <p className="text-sm text-neutral-600">Scans will appear here after you start scanning codes.</p>
        ) : (
          <ul className="divide-y divide-neutral-200">
            {recentScans.map((scan) => (
              <li key={scan.id} className="py-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs text-neutral-600">
                      {scan.createdAt ? new Date(scan.createdAt).toLocaleString() : 'Just now'}
                    </p>
                    <p className="break-all font-mono text-xs text-neutral-800">{scan.rawValue}</p>
                    {scan.decodedId && (
                      <p className="text-xs text-neutral-700">
                        Linked {scan.decodedType ?? 'entity'}: {scan.decodedLabel ?? scan.decodedId}
                      </p>
                    )}
                    {scan.errorMessage && (
                      <p className="text-xs text-amber-700">Last error: {scan.errorMessage}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 text-right">
                    <span className="rounded bg-neutral-100 px-2 py-1 text-[10px] font-semibold uppercase text-neutral-700">
                      {scan.outcome}
                    </span>
                    <button
                      className="rounded border border-blue-200 px-2 py-1 text-[11px] font-semibold text-blue-700"
                      onClick={() => {
                        setQrValue(scan.rawValue);
                        void reopenScan(scan.rawValue);
                      }}
                      type="button"
                    >
                      Open link
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {step === 'asset' && asset && (
        <div className="space-y-2 rounded border border-neutral-200 p-3">
          <p className="text-sm text-neutral-600">Asset ready</p>
          <p className="text-lg font-semibold text-neutral-900">{(asset as any).name ?? 'Asset'}</p>
          <label className="block text-sm font-medium">Work order title</label>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full rounded border border-neutral-300 p-2 text-sm"
          />
          <label className="block text-sm font-medium">Description</label>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={2}
            className="w-full rounded border border-neutral-300 p-2 text-sm"
          />
          <button
            className="rounded bg-green-600 px-3 py-2 text-sm font-semibold text-white"
            onClick={() => createWorkOrder({ title, description })}
          >
            Start work order
          </button>
        </div>
      )}

      {step === 'workorder' && (
        <div className="space-y-2 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p>Work order created: {workOrderId ?? 'pending id'}</p>
          <button
            className="rounded bg-amber-700 px-3 py-2 text-white"
            onClick={() => completeWorkOrder()}
          >
            Complete work order
          </button>
        </div>
      )}

      {step === 'complete' && (
        <div className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          <p>Work order completed and asset updated from QR scan.</p>
        </div>
      )}
    </div>
  );
}; 

export default ScanFlow;
