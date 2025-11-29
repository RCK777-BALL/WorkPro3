/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useState } from 'react';

import type {
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderPayload,
  PurchaseOrderStatus,
  ReceiptLine,
} from '@backend-shared/purchaseOrders';

import {
  fetchPurchaseOrders,
  receivePurchaseOrder,
  savePurchaseOrder,
  updatePurchaseOrderStatus,
} from '@/api/purchasing';
import Button from '@/components/common/Button';

const statusOrder: PurchaseOrderStatus[] = ['draft', 'pending', 'approved', 'received'];

const emptyItem = (): PurchaseOrderItem => ({
  partId: '',
  quantity: 1,
  unitCost: 0,
  received: 0,
  status: 'open',
});

const buildEmptyForm = (): PurchaseOrderPayload & { id?: string } => ({ vendorId: '', items: [emptyItem()] });

const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

export default function PurchaseOrderPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [form, setForm] = useState<PurchaseOrderPayload & { id?: string }>(buildEmptyForm());
  const [receipts, setReceipts] = useState<Record<string, number>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPurchaseOrders()
      .then(setOrders)
      .catch(() => setOrders([]));
  }, []);

  const selected = useMemo(() => orders.find((po) => po.id === form.id), [orders, form.id]);

  const updateItem = (index: number, update: Partial<PurchaseOrderItem>) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, idx) => (idx === index ? { ...item, ...update } : item)),
    }));
  };

  const addItem = () => setForm((current) => ({ ...current, items: [...current.items, emptyItem()] }));

  const resetForm = () => {
    setForm(buildEmptyForm());
    setReceipts({});
  };

  const save = async () => {
    setSubmitting(true);
    setStatusMessage(null);
    try {
      const payload: PurchaseOrderPayload & { id?: string } = {
        vendorId: form.vendorId,
        items: form.items.map((item) => ({ partId: item.partId, quantity: item.quantity, unitCost: item.unitCost })),
        status: form.status ?? undefined,
        id: form.id,
      };
      const saved = await savePurchaseOrder(payload);
      setOrders((current) => {
        const existing = current.some((item) => item.id === saved.id);
        if (existing) {
          return current.map((item) => (item.id === saved.id ? saved : item));
        }
        return [saved, ...current];
      });
      setForm({ ...saved, items: saved.items });
      setStatusMessage('Purchase order saved');
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Failed to save purchase order');
    } finally {
      setSubmitting(false);
    }
  };

  const transition = async (order: PurchaseOrder) => {
    const currentIndex = statusOrder.indexOf(order.status);
    if (currentIndex === -1) return;
    const nextStatus = statusOrder[currentIndex + 1];
    if (!nextStatus) return;
    try {
      const updated = await updatePurchaseOrderStatus(order.id, nextStatus);
      setOrders((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      if (form.id === updated.id) {
        setForm({ ...updated, items: updated.items });
      }
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const receive = async () => {
    if (!selected) return;
    const lines: ReceiptLine[] = selected.items
      .map((item) => ({ partId: item.partId, quantity: receipts[item.partId] ?? 0 }))
      .filter((line) => line.quantity > 0);
    if (!lines.length) {
      setStatusMessage('Enter at least one quantity to receive');
      return;
    }
    try {
      const updated = await receivePurchaseOrder(selected.id, lines);
      setOrders((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setForm({ ...updated, items: updated.items });
      setReceipts({});
      setStatusMessage('Receipt recorded');
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Failed to receive items');
    }
  };

  const total = form.items.reduce((sum, item) => sum + item.quantity * (item.unitCost ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Purchase orders</h1>
          <p className="text-sm text-neutral-600">Create drafts, route for approval, and record receipts.</p>
        </div>
        <Button variant="outline" onClick={resetForm}>
          New PO
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-4 rounded-lg border border-neutral-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-neutral-900">{form.id ? 'Edit purchase order' : 'New purchase order'}</h2>
            {form.status && <span className="text-xs uppercase text-neutral-500">{form.status}</span>}
          </div>
          <div className="space-y-3">
            <label className="block text-sm font-medium text-neutral-700">
              Vendor ID
              <input
                className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2"
                value={form.vendorId}
                onChange={(e) => setForm((current) => ({ ...current, vendorId: e.target.value }))}
                placeholder="Vendor"
              />
            </label>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-neutral-700">Line items</p>
                <Button variant="outline" size="sm" onClick={addItem}>
                  Add line
                </Button>
              </div>
              {form.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-6 gap-2">
                  <input
                    className="col-span-3 rounded-md border border-neutral-300 px-3 py-2"
                    placeholder="Part ID"
                    value={item.partId}
                    onChange={(e) => updateItem(idx, { partId: e.target.value })}
                  />
                  <input
                    className="col-span-1 rounded-md border border-neutral-300 px-3 py-2"
                    type="number"
                    min={0}
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                  />
                  <input
                    className="col-span-2 rounded-md border border-neutral-300 px-3 py-2"
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.unitCost ?? 0}
                    onChange={(e) => updateItem(idx, { unitCost: Number(e.target.value) })}
                  />
                </div>
              ))}
              <p className="text-right text-sm font-semibold text-neutral-900">Estimated total: {formatCurrency(total)}</p>
            </div>

            <Button onClick={save} loading={submitting} disabled={!form.vendorId || !form.items.length}>
              {form.id ? 'Update purchase order' : 'Create purchase order'}
            </Button>
            {statusMessage && <p className="text-xs text-neutral-500">{statusMessage}</p>}
          </div>
        </section>

        <section className="lg:col-span-2 space-y-4 rounded-lg border border-neutral-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-neutral-900">Order queue</h2>
              <p className="text-xs text-neutral-500">Draft through receipt with status-controlled transitions.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200 text-sm">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-neutral-700">PO</th>
                  <th className="px-3 py-2 text-left font-medium text-neutral-700">Vendor</th>
                  <th className="px-3 py-2 text-left font-medium text-neutral-700">Status</th>
                  <th className="px-3 py-2 text-left font-medium text-neutral-700">Lines</th>
                  <th className="px-3 py-2 text-left font-medium text-neutral-700">Total</th>
                  <th className="px-3 py-2 text-right font-medium text-neutral-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {orders.map((po) => (
                  <tr key={po.id} className={po.id === form.id ? 'bg-neutral-50' : ''}>
                    <td className="px-3 py-2 text-neutral-900">{po.id}</td>
                    <td className="px-3 py-2 text-neutral-700">{po.vendorId}</td>
                    <td className="px-3 py-2 text-neutral-700 capitalize">{po.status}</td>
                    <td className="px-3 py-2 text-neutral-700">{po.items.length}</td>
                    <td className="px-3 py-2 text-neutral-700">{formatCurrency(po.totalCost)}</td>
                    <td className="px-3 py-2 text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setForm({ ...po, items: po.items });
                          setReceipts(
                            po.items.reduce<Record<string, number>>((acc, item) => {
                              acc[item.partId] = 0;
                              return acc;
                            }, {}),
                          );
                        }}
                      >
                        Edit
                      </Button>
                      {po.status !== 'received' && (
                        <Button variant="outline" size="sm" onClick={() => transition(po)}>
                          Move to {statusOrder[statusOrder.indexOf(po.status) + 1] ?? 'done'}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {!orders.length && (
                  <tr>
                    <td className="px-3 py-4 text-neutral-500" colSpan={6}>
                      No purchase orders yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {selected && (
            <div className="space-y-3 rounded-md border border-dashed border-neutral-300 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-neutral-900">Receiving for PO {selected.id}</p>
                <p className="text-xs text-neutral-500">Status: {selected.status}</p>
              </div>
              <div className="space-y-2">
                {selected.items.map((item) => {
                  const remaining = Math.max(0, item.quantity - (item.received ?? 0));
                  return (
                    <div key={item.partId} className="grid grid-cols-6 items-center gap-2 text-sm">
                      <div className="col-span-2 text-neutral-800">Part {item.partId}</div>
                      <div className="text-neutral-600">Ordered: {item.quantity}</div>
                      <div className="text-neutral-600">Received: {item.received}</div>
                      <input
                        className="col-span-2 rounded-md border border-neutral-300 px-2 py-1"
                        type="number"
                        min={0}
                        max={remaining}
                        value={receipts[item.partId] ?? ''}
                        placeholder={`Receive up to ${remaining}`}
                        onChange={(e) =>
                          setReceipts((current) => ({
                            ...current,
                            [item.partId]: Number(e.target.value),
                          }))
                        }
                        disabled={remaining === 0 || selected.status === 'draft' || selected.status === 'pending'}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={resetForm}>
                  Clear
                </Button>
                <Button
                  size="sm"
                  onClick={receive}
                  disabled={selected.status !== 'approved' && selected.status !== 'received'}
                >
                  Record receipt
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
