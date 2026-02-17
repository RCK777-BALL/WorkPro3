/*
 * SPDX-License-Identifier: MIT
 */

import type { AssetCostRollup } from '@/api/assets';
import { SimpleBarChart } from '@/components/charts/SimpleBarChart';

export type AssetCostRollupChartProps = {
  cost?: AssetCostRollup;
  isLoading?: boolean;
};

const formatCurrency = (value?: number, currency = 'USD') =>
  typeof value === 'number' ? new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value) : '-';

const AssetCostRollupChart = ({ cost, isLoading }: AssetCostRollupChartProps) => {
  if (isLoading) {
    return <p className="text-sm text-[var(--wp-color-text-muted)]">Calculating cost rollups...</p>;
  }

  if (!cost) {
    return <p className="text-sm text-[var(--wp-color-text-muted)]">No cost history available.</p>;
  }

  const barData = cost.monthly.map((bucket) => ({ label: bucket.month, value: Math.round(bucket.total) }));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article>
          <p className="text-xs uppercase text-[var(--wp-color-text-muted)]">Total</p>
          <p className="text-2xl font-bold text-[var(--wp-color-text)]">{formatCurrency(cost.total, cost.currency)}</p>
        </article>
        <article>
          <p className="text-xs uppercase text-[var(--wp-color-text-muted)]">Labor</p>
          <p className="text-xl font-semibold text-[var(--wp-color-text)]">{formatCurrency(cost.labor, cost.currency)}</p>
        </article>
        <article>
          <p className="text-xs uppercase text-[var(--wp-color-text-muted)]">Parts</p>
          <p className="text-xl font-semibold text-[var(--wp-color-text)]">{formatCurrency(cost.parts, cost.currency)}</p>
        </article>
        <article>
          <p className="text-xs uppercase text-[var(--wp-color-text-muted)]">Reporting window</p>
          <p className="text-base text-[var(--wp-color-text)]">{cost.timeframe}</p>
        </article>
      </div>
      <div className="h-72 rounded-2xl border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] p-4">
        <SimpleBarChart data={barData} />
      </div>
    </div>
  );
};

export default AssetCostRollupChart;

