/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useState } from 'react';

import {
  createPurchaseOrder,
  listPurchaseOrders,
  updatePurchaseOrderStatus,
  type PurchaseOrder,
  type PurchaseOrderStatus,
} from '@/api/purchasing';
import Button from '@/components/common/Button';
import { useVendors } from '@/hooks/useVendors';

export default function PurchaseOrderPage() {
  const [vendorId, setVendorId] = useState('');
  const [item, setItem] = useState('');
  const [qty, setQty] = useState(0);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const { data: vendors } = useVendors();
  const vendorList = vendors ?? [];
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listPurchaseOrders().then(setOrders).catch(() => setOrders([]));
  }, []);

  const submit = async () => {
    if (!vendorId || !item || qty <= 0) {
      setError('Vendor, item, and quantity are required');
      return;
    }
    setError(null);
    const created = await createPurchaseOrder({
      vendorId,
      lines: [{ part: item, qtyOrdered: qty }],
    });
    setOrders((prev) => [created, ...prev]);
    setVendorId('');
    setItem('');
    setQty(0);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-neutral-900">Create Purchase Order</h1>
        <select
          className="block w-full rounded-md border border-neutral-300 px-3 py-2"
          value={vendorId}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setVendorId(e.target.value)}
        >
          <option value="">Select vendor…</option>
          {vendorList.map((vendor) => (
            <option key={vendor.id} value={vendor.id}>
              {vendor.name} {vendor.email ? `(${vendor.email})` : ''}
            </option>
          ))}
        </select>
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
        {error && <p className="text-sm text-error-600">{error}</p>}
      </div>

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
                  <td className="px-3 py-2 text-neutral-700">{po.lines.length}</td>
                  <td className="px-3 py-2 text-right">
                    {po.status !== 'Received' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const updated = await updatePurchaseOrderStatus(po.id, 'Received' as PurchaseOrderStatus);
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
