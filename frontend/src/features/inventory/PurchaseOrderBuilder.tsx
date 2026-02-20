/*
 * SPDX-License-Identifier: MIT
 */

import { FormEvent, useMemo, useState } from 'react';

import Button from '@/components/common/Button';
import type { Part } from '@/types';
import { useCreatePurchaseOrder, usePartsQuery, useVendorsQuery } from './hooks';

const resolveReorderQuantity = (part: Part): number => {
  if (part.reorderQty && part.reorderQty > 0) return part.reorderQty;
  if (part.minStock && part.minStock > 0) {
    const delta = part.minStock - part.quantity;
    if (delta > 0) return delta;
  }
  const diff = part.reorderPoint - part.quantity;
  return diff > 0 ? diff : part.reorderPoint || 1;
};

const PurchaseOrderBuilder = () => {
  const partsQuery = usePartsQuery({ pageSize: 200, sortBy: 'quantity', sortDirection: 'asc' });
  const vendorsQuery = useVendorsQuery();
  const mutation = useCreatePurchaseOrder();
  const [vendorId, setVendorId] = useState('');
  const [selectedPartIds, setSelectedPartIds] = useState<string[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const reorderCandidates = useMemo(
    () => (partsQuery.data?.items ?? []).filter((part) => part.alertState?.needsReorder),
    [partsQuery.data?.items],
  );

  const handleToggle = (partId: string, part: Part) => {
    setSelectedPartIds((prev) => {
      if (prev.includes(partId)) {
        return prev.filter((id) => id !== partId);
      }
      setQuantities((q) => ({ ...q, [partId]: q[partId] ?? resolveReorderQuantity(part) }));
      return [...prev, partId];
    });
  };

  const handleQuantityChange = (partId: string, value: number) => {
    setQuantities((prev) => ({ ...prev, [partId]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setStatusMessage(null);
    if (!vendorId) {
      setStatusMessage('Select a vendor to continue.');
      return;
    }
    if (selectedPartIds.length === 0) {
      setStatusMessage('Pick at least one part to include in the PO.');
      return;
    }
    const items = selectedPartIds
      .map((id) => ({ partId: id, quantity: Number(quantities[id]) || 0 }))
      .filter((item) => item.quantity > 0);
    if (!items.length) {
      setStatusMessage('Quantities must be positive.');
      return;
    }
    try {
      await mutation.mutateAsync({ vendorId, items });
      setSelectedPartIds([]);
      setQuantities({});
      setStatusMessage('Purchase order created successfully.');
    } catch (err) {
      console.error(err);
      setStatusMessage('Failed to create purchase order.');
    }
  };

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="border-b border-neutral-100 pb-3">
          <h3 className="text-base font-semibold text-neutral-900">Build purchase order</h3>
          <p className="text-xs text-neutral-500">Select vendor and the parts that need replenishment.</p>
        </div>
        <label className="text-sm text-neutral-700">
          Vendor
          <select
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
            value={vendorId}
            onChange={(event) => setVendorId(event.target.value)}
          >
            <option value="">Select vendor</option>
            {(vendorsQuery.data ?? []).map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.name}
              </option>
            ))}
          </select>
        </label>
        <div className="max-h-80 overflow-auto rounded-lg border border-neutral-100">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-3 py-2">Include</th>
                <th className="px-3 py-2">Part</th>
                <th className="px-3 py-2">Quantity</th>
                <th className="px-3 py-2">Vendor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {reorderCandidates.map((part) => (
                <tr key={part.id}>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      className="rounded border-neutral-300"
                      checked={selectedPartIds.includes(part.id)}
                      onChange={() => handleToggle(part.id, part)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <p className="font-medium text-neutral-900">{part.name}</p>
                    <p className="text-xs text-neutral-500">Stock {part.quantity}</p>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={1}
                      className="w-24 rounded-md border border-neutral-300 px-2 py-1"
                      value={quantities[part.id] ?? resolveReorderQuantity(part)}
                      onChange={(event) => handleQuantityChange(part.id, Number(event.target.value))}
                      disabled={!selectedPartIds.includes(part.id)}
                    />
                  </td>
                  <td className="px-3 py-2 text-xs text-neutral-500">
                    {part.vendor?.name ?? 'Any'}
                  </td>
                </tr>
              ))}
              {reorderCandidates.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-xs text-neutral-500">
                    All parts are above their reorder points.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {statusMessage && <p className="text-sm text-neutral-600">{statusMessage}</p>}
        <div className="flex justify-end">
          <Button type="submit" loading={mutation.isPending} disabled={reorderCandidates.length === 0}>
            Generate purchase order
          </Button>
        </div>
      </form>
    </section>
  );
};

export default PurchaseOrderBuilder;

