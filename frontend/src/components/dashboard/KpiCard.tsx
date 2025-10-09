/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import { Sparkline } from '@/components/charts/Sparkline';

export interface KpiCardProps {
  title: string;
  value: string | number;
  deltaPct?: number;
  series?: number[];
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, deltaPct, series = [] }) => {
  const deltaClass = deltaPct && deltaPct < 0 ? 'text-red-600' : 'text-green-600';

  return (
    <div className="rounded border bg-card p-4 text-card-foreground shadow">
      <div className="text-sm text-neutral-500">{title}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {typeof deltaPct === 'number' && (
        <div className={`text-xs ${deltaClass}`}>
          {deltaPct >= 0 ? '+' : ''}
          {deltaPct.toFixed(1)}%
        </div>
      )}
      {series.length > 0 && (
        <div className="mt-2 h-8 w-full">
          <Sparkline data={series} color="var(--color-brand-start)" className="h-full w-full" />
        </div>
      )}
    </div>
  );
};

export default KpiCard;
