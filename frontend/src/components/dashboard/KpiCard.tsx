/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import { ResponsiveContainer, LineChart, Line } from 'recharts';

export interface KpiCardProps {
  title: string;
  value: string | number;
  deltaPct?: number;
  series?: number[];
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, deltaPct, series = [] }) => {
  const deltaClass = deltaPct && deltaPct < 0 ? 'text-red-600' : 'text-green-600';

  const chartData = series.map((v, i) => ({ index: i, value: v }));

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
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--color-brand-start)"
                dot={false}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default KpiCard;
