/*
 * SPDX-License-Identifier: MIT
 */

import { useState } from 'react';
import { useScanWorkflow } from './useScanWorkflow';

export const ScanFlow = () => {
  const [qrValue, setQrValue] = useState('');
  const [title, setTitle] = useState('Mobile work order');
  const [description, setDescription] = useState('');
  const { step, asset, error, workOrderId, startFromQr, createWorkOrder, completeWorkOrder } = useScanWorkflow();

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
