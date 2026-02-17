/*
 * SPDX-License-Identifier: MIT
 */

import { useMemo, useState } from 'react';

import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Badge from '@/components/common/Badge';
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders';
import type { PurchaseOrder } from '@/api/purchasing';
import ReceiveModal from './ReceiveModal';

const PurchaseOrderReceivingPage = () => {
  const { data: orders, isLoading } = usePurchaseOrders();
  const [selected, setSelected] = useState<PurchaseOrder | undefined>();
  const [open, setOpen] = useState(false);

  const receivableOrders = useMemo(
    () => (orders ?? []).filter((order) => ['sent', 'partially_received'].includes(order.status)),
    [orders],
  );

  const handleOpen = (order: PurchaseOrder) => {
    setSelected(order);
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <p className="text-sm text-[var(--wp-color-text-muted)]">Purchasing</p>
        <h1 className="text-2xl font-semibold text-[var(--wp-color-text)]">Receive purchase orders</h1>
        <p className="text-sm text-[var(--wp-color-text-muted)]">Capture inbound quantities for sent purchase orders.</p>
      </header>

      <Card>
        <Card.Header>
          <div className="flex items-center justify-between">
            <div>
              <Card.Title>Ready to receive</Card.Title>
              <Card.Description>Only sent purchase orders appear here.</Card.Description>
            </div>
            <Badge text={`${receivableOrders.length} open`} color={receivableOrders.length ? 'warning' : 'success'} />
          </div>
        </Card.Header>
        <Card.Content>
          {isLoading && <p className="text-sm text-[var(--wp-color-text-muted)]">Loading purchase orders…</p>}
          {!isLoading && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200 text-sm">
                <thead className="bg-[var(--wp-color-surface)]">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-[var(--wp-color-text)]">PO</th>
                    <th className="px-3 py-2 text-left font-medium text-[var(--wp-color-text)]">Vendor</th>
                    <th className="px-3 py-2 text-left font-medium text-[var(--wp-color-text)]">Status</th>
                    <th className="px-3 py-2 text-left font-medium text-[var(--wp-color-text)]">Lines</th>
                    <th className="px-3 py-2 text-left font-medium text-[var(--wp-color-text)]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {receivableOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-[var(--wp-color-surface)]">
                      <td className="px-3 py-2 text-[var(--wp-color-text)]">{order.poNumber ?? order.id}</td>
                      <td className="px-3 py-2 text-[var(--wp-color-text)]">{order.vendor?.name ?? order.vendorId ?? '—'}</td>
                      <td className="px-3 py-2 text-[var(--wp-color-text)] capitalize">{order.status.replace('_', ' ')}</td>
                      <td className="px-3 py-2 text-[var(--wp-color-text)]">{order.lines.length}</td>
                      <td className="px-3 py-2">
                        <Button size="sm" variant="outline" onClick={() => handleOpen(order)}>
                          Receive
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {!receivableOrders.length && (
                    <tr>
                      <td className="px-3 py-6 text-center text-[var(--wp-color-text-muted)]" colSpan={5}>
                        All purchase orders have been fully received.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card.Content>
      </Card>

      <ReceiveModal purchaseOrder={selected} isOpen={open} onClose={() => setOpen(false)} />
    </div>
  );
};

export default PurchaseOrderReceivingPage;

