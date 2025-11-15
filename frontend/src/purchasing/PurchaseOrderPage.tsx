/*
 * SPDX-License-Identifier: MIT
 */

import { useState } from 'react';

import { createPurchaseOrder } from '@/api/purchasing';
import { downloadPurchaseOrderExport, type PurchaseOrderExportFormat } from '@/api/inventory';
import Button from '@/components/common/Button';
import { triggerFileDownload } from '@/utils/download';

export default function PurchaseOrderPage() {
  const [vendor, setVendor] = useState('');
  const [item, setItem] = useState('');
  const [qty, setQty] = useState(0);
  const [exporting, setExporting] = useState<PurchaseOrderExportFormat | null>(null);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

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
    </div>
  );
}
