/*
 * SPDX-License-Identifier: MIT
 */

import type { AssetWorkOrderSummary } from '@/api/assets';

export type AssetWorkOrderListProps = {
  workOrders?: AssetWorkOrderSummary[];
  isLoading?: boolean;
};

const formatDate = (value?: string) => (value ? new Date(value).toLocaleDateString() : 'No updates');

const AssetWorkOrderList = ({ workOrders, isLoading }: AssetWorkOrderListProps) => {
  if (isLoading) {
    return <p className="text-sm text-neutral-400">Loading work orders…</p>;
  }

  if (!workOrders?.length) {
    return <p className="text-sm text-neutral-500">No open work orders for this asset.</p>;
  }

  return (
    <ul className="space-y-3">
      {workOrders.map((order) => (
        <li key={order.id} className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-base font-semibold text-white">{order.title}</p>
              <p className="text-xs text-neutral-400">Due {formatDate(order.dueDate)}</p>
            </div>
            <span className="text-xs uppercase text-indigo-200">{order.priority}</span>
          </div>
          <p className="mt-2 text-sm text-neutral-300">
            {order.type} • {order.status} • {formatDate(order.updatedAt)}
          </p>
        </li>
      ))}
    </ul>
  );
};

export default AssetWorkOrderList;
