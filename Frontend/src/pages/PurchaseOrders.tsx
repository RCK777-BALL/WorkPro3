import React, { useEffect, useState } from 'react';
import POModal from '../components/modals/POModal';
import { fetchPurchaseOrders } from '../api/endpoints/purchaseOrders';

const PurchaseOrders: React.FC = () => {
  const [orders, setOrders] = useState<Record<string, unknown>[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchPurchaseOrders().then((response) => setOrders(response.items));
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--wp-color-text)]">Purchase Orders</h1>
          <p className="text-sm text-[var(--wp-color-text-muted)]">Track open POs and receive inventory.</p>
        </div>
        <button className="rounded bg-[var(--wp-color-primary)] px-4 py-2 text-sm text-[var(--wp-color-text)]" onClick={() => setIsOpen(true)}>
          New PO
        </button>
      </header>

      <div className="rounded-lg border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)]">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--wp-color-border)] text-left text-xs uppercase text-[var(--wp-color-text-muted)]">
            <tr>
              <th className="px-4 py-2">PO</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={String(order._id ?? order.id)} className="border-b border-[var(--wp-color-border)]">
                <td className="px-4 py-2 text-[var(--wp-color-text)]">{String(order.poNumber ?? 'PO')}</td>
                <td className="px-4 py-2 text-[var(--wp-color-text-muted)]">{String(order.status ?? 'draft')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <POModal isOpen={isOpen} onClose={() => setIsOpen(false)} onSave={() => setIsOpen(false)} />
    </div>
  );
};

export default PurchaseOrders;

