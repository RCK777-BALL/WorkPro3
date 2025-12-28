/*
 * SPDX-License-Identifier: MIT
 */

import { Download } from 'lucide-react';

import Button from '@/components/common/Button';
import { exportToPDF } from '@/utils/export';
import { usePartsQuery } from './hooks';

const PdfExportPanel = () => {
  const { data, isLoading } = usePartsQuery();
  const items = data?.items ?? [];

  const handleExport = () => {
    if (!items.length) return;
    exportToPDF(
      items,
      'inventory-parts',
      (part) => ({
        Name: part.name,
        SKU: part.sku ?? '—',
        Quantity: part.quantity,
        Vendor: part.vendor?.name ?? 'Unassigned',
        'Linked Assets': part.assets?.map((asset) => asset.name).join(', ') ?? '—',
      }),
    );
  };

  return (
    <section className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4 text-sm text-neutral-600">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-semibold text-neutral-900">Need a PDF snapshot?</p>
          <p className="text-xs text-neutral-500">Download the current table for vendor sharing.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          icon={<Download size={14} />}
          onClick={handleExport}
          disabled={items.length === 0}
          loading={isLoading}
        >
          Export PDF
        </Button>
      </div>
    </section>
  );
};

export default PdfExportPanel;
