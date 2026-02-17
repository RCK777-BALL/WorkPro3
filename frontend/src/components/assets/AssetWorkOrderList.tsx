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
    return <p className="text-sm text-[var(--wp-color-text-muted)]">Loading work orders...</p>;
  }

  if (!workOrders?.length) {
    return <p className="text-sm text-[var(--wp-color-text-muted)]">No open work orders for this asset.</p>;
  }

  return (
    <ul className="space-y-3">
      {workOrders.map((order) => (
        <li key={order.id} className="rounded-2xl border border-[var(--wp-color-border)] bg-[color-mix(in_srgb,var(--wp-color-surface)_70%,transparent)] p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-base font-semibold text-[var(--wp-color-text)]">{order.title}</p>
              <p className="text-xs text-[var(--wp-color-text-muted)]">Due {formatDate(order.dueDate)}</p>
            </div>
            <span className="text-xs uppercase text-[var(--wp-color-primary)]">{order.priority}</span>
          </div>
          <p className="mt-2 text-sm text-[var(--wp-color-text-muted)]">
            {order.type} | {order.status} | {formatDate(order.updatedAt)}
          </p>
        </li>
      ))}
    </ul>
  );
};

export default AssetWorkOrderList;

