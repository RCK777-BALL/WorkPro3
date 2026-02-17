/*
 * SPDX-License-Identifier: MIT
 */

import type { AssetBomPart } from '@/api/assets';

export type AssetBomTableProps = {
  parts?: AssetBomPart[];
  isLoading?: boolean;
};

const formatCurrency = (value?: number) =>
  typeof value === 'number' ? new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(value) : '-';

const AssetBomTable = ({ parts, isLoading }: AssetBomTableProps) => {
  if (isLoading) {
    return <p className="text-sm text-[var(--wp-color-text-muted)]">Loading bill of materials...</p>;
  }

  if (!parts?.length) {
    return <p className="text-sm text-[var(--wp-color-text-muted)]">No BOM parts associated with this asset.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--wp-color-border)]">
      <table className="min-w-full divide-y divide-[var(--wp-color-border)] text-sm">
        <thead className="bg-[color-mix(in_srgb,var(--wp-color-surface)_70%,transparent)] text-[var(--wp-color-text-muted)]">
          <tr>
            <th className="px-4 py-3 text-left font-semibold">Part</th>
            <th className="px-4 py-3 text-left font-semibold">Quantity</th>
            <th className="px-4 py-3 text-left font-semibold">Location</th>
            <th className="px-4 py-3 text-left font-semibold">Unit cost</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--wp-color-border)] text-[var(--wp-color-text)]">
          {parts.map((part) => (
            <tr key={part.id} className="hover:bg-[color-mix(in_srgb,var(--wp-color-surface)_65%,transparent)]">
              <td className="px-4 py-3">
                <div className="font-medium">{part.name}</div>
                {part.partNumber && <p className="text-xs text-[var(--wp-color-text-muted)]">#{part.partNumber}</p>}
              </td>
              <td className="px-4 py-3">{part.quantity}</td>
              <td className="px-4 py-3">{part.location ?? '—'}</td>
              <td className="px-4 py-3">{formatCurrency(part.unitCost)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AssetBomTable;


