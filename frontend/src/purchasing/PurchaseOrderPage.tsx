/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useState } from 'react';

import { createPurchaseOrder } from '@/api/purchasing';
import {
  downloadPurchaseOrderExport,
  fetchPurchaseOrders,
  updatePurchaseOrderStatus,
  type PurchaseOrderExportFormat,
} from '@/api/inventory';
import Button from '@/components/common/Button';
import { triggerFileDownload } from '@/utils/download';
import type { PurchaseOrder } from '@/types';

export default function PurchaseOrderPage() {
  const [vendor, setVendor] = useState('');
  const [item, setItem] = useState('');
  const [qty, setQty] = useState(0);
  const [exporting, setExporting] = useState<PurchaseOrderExportFormat | null>(null);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);

  useEffect(() => {
    fetchPurchaseOrders().then(setOrders).catch(() => setOrders([]));
  }, []);

  const submit = async () => {
    await createPurchaseOrder({ vendor, items: [{ item, quantity: qty }] });
    setVendor('');
    setItem('');
    setQty(0);
  };

  const handleExport = async (format: PurchaseOrderExportFormat) => {
    setExportStatus(null);
    setExporting(format);
    try {
      const file = await downloadPurchaseOrderExport(format);
      const blob = new Blob([file.data], { type: file.mimeType });
      triggerFileDownload(blob, file.fileName);
      setExportStatus(`Downloaded ${file.fileName}`);
    } catch (err) {
      setExportStatus(err instanceof Error ? err.message : 'Failed to export purchase orders');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-neutral-900">Create Purchase Order</h1>
        <input
          className="block w-full rounded-md border border-neutral-300 px-3 py-2"
          placeholder="Vendor ID"
          value={vendor}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVendor(e.target.value)}
        />
        <input
          className="block w-full rounded-md border border-neutral-300 px-3 py-2"
          placeholder="Item ID"
          value={item}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setItem(e.target.value)}
        />
        <input
          className="block w-full rounded-md border border-neutral-300 px-3 py-2"
          type="number"
          placeholder="Quantity"
          value={qty}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQty(Number(e.target.value))}
        />
        <Button onClick={submit}>Create</Button>
      </div>

      <section className="rounded-lg border border-neutral-200 p-4">
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-sm font-semibold text-neutral-900">Export for ERP</p>
            <p className="text-xs text-neutral-500">Download CSV or PDF purchase orders compatible with SAP and Oracle.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              loading={exporting === 'csv'}
              disabled={exporting !== null}
              onClick={() => handleExport('csv')}
            >
              Export CSV
            </Button>
            <Button
              type="button"
              variant="outline"
              loading={exporting === 'pdf'}
              disabled={exporting !== null}
              onClick={() => handleExport('pdf')}
            >
              Export PDF
            </Button>
          </div>
          {exportStatus && <p className="text-xs text-neutral-500">{exportStatus}</p>}
        </div>
      </section>

      <section className="rounded-lg border border-neutral-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-neutral-900">Open purchase orders</p>
            <p className="text-xs text-neutral-500">Tracks workflow from draft to receipt.</p>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200 text-sm">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-neutral-700">PO #</th>
                <th className="px-3 py-2 text-left font-medium text-neutral-700">Status</th>
                <th className="px-3 py-2 text-left font-medium text-neutral-700">Vendor</th>
                <th className="px-3 py-2 text-left font-medium text-neutral-700">Lines</th>
                <th className="px-3 py-2 text-right font-medium text-neutral-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {orders.map((po) => (
                <tr key={po.id}>
                  <td className="px-3 py-2 text-neutral-900">{po.poNumber ?? po.id}</td>
                  <td className="px-3 py-2 text-neutral-700">{po.status}</td>
                  <td className="px-3 py-2 text-neutral-700">{po.vendor?.name ?? '—'}</td>
                  <td className="px-3 py-2 text-neutral-700">{po.items.length}</td>
                  <td className="px-3 py-2 text-right">
                    {po.status !== 'Received' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const updated = await updatePurchaseOrderStatus(po.id, { status: 'received' });
                          setOrders((current) => current.map((item) => (item.id === updated.id ? updated : item)));
                        }}
                      >
                        Mark received
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {!orders.length && (
                <tr>
                  <td className="px-3 py-4 text-neutral-500" colSpan={5}>
                    No purchase orders yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
