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
    return <p className="text-sm text-neutral-400">Loading bill of materials…</p>;
  }

  if (!parts?.length) {
    return <p className="text-sm text-neutral-500">No BOM parts associated with this asset.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-800">
      <table className="min-w-full divide-y divide-neutral-800 text-sm">
        <thead className="bg-neutral-900/60 text-neutral-400">
          <tr>
            <th className="px-4 py-3 text-left font-semibold">Part</th>
            <th className="px-4 py-3 text-left font-semibold">Quantity</th>
            <th className="px-4 py-3 text-left font-semibold">Location</th>
            <th className="px-4 py-3 text-left font-semibold">Unit cost</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-900 text-neutral-100">
          {parts.map((part) => (
            <tr key={part.id} className="hover:bg-neutral-900/40">
              <td className="px-4 py-3">
                <div className="font-medium">{part.name}</div>
                {part.partNumber && <p className="text-xs text-neutral-400">#{part.partNumber}</p>}
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
