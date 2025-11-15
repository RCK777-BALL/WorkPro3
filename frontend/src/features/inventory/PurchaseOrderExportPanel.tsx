/*
 * SPDX-License-Identifier: MIT
 */

import { FileSpreadsheet, FileText } from 'lucide-react';
import { useState } from 'react';

import Button from '@/components/common/Button';
import { downloadPurchaseOrderExport, type PurchaseOrderExportFormat } from '@/api/inventory';
import { triggerFileDownload } from '@/utils/download';

const statusLabel = (format: PurchaseOrderExportFormat | null) => {
  if (format === 'csv') return 'Preparing CSV…';
  if (format === 'pdf') return 'Rendering PDF…';
  return null;
};

const PurchaseOrderExportPanel = () => {
  const [activeFormat, setActiveFormat] = useState<PurchaseOrderExportFormat | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleExport = async (format: PurchaseOrderExportFormat) => {
    setActiveFormat(format);
    setStatusMessage(null);
    try {
      const file = await downloadPurchaseOrderExport(format);
      const blob = new Blob([file.data], { type: file.mimeType });
      triggerFileDownload(blob, file.fileName);
      setStatusMessage(`Downloaded ${file.fileName}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export purchase orders.';
      setStatusMessage(message);
    } finally {
      setActiveFormat(null);
    }
  };

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="space-y-3">
        <div>
          <h3 className="text-base font-semibold text-neutral-900">ERP purchase order exports</h3>
          <p className="text-xs text-neutral-500">
            Generate CSV or PDF files that accounting can import into SAP, Oracle, or Dynamics.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="outline"
            icon={<FileSpreadsheet size={14} />}
            loading={activeFormat === 'csv'}
            disabled={activeFormat !== null}
            onClick={() => handleExport('csv')}
          >
            Export CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            icon={<FileText size={14} />}
            loading={activeFormat === 'pdf'}
            disabled={activeFormat !== null}
            onClick={() => handleExport('pdf')}
          >
            Export PDF
          </Button>
        </div>
        {statusMessage ? (
          <p className="text-xs text-neutral-500">{statusMessage}</p>
        ) : (
          <p className="text-xs text-neutral-400">{statusLabel(activeFormat) ?? 'Exports include vendor and quantity breakdowns.'}</p>
        )}
      </div>
    </section>
  );
};

export default PurchaseOrderExportPanel;
