/*
 * SPDX-License-Identifier: MIT
 */

import type { CSSProperties } from 'react';
import clsx from 'clsx';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';

type BarDatum = {
  label: string;
  value: number;
  color?: string;
};

type SimpleBarChartProps = {
  data: BarDatum[];
  className?: string;
  grid?: boolean;
};

const tooltipStyle: CSSProperties = {
  backgroundColor: 'rgba(17, 24, 39, 0.9)',
  border: 'none',
  color: '#f9fafb',
  borderRadius: '0.375rem',
  padding: '0.5rem 0.75rem',
  fontSize: '0.875rem',
};

export function SimpleBarChart({ data, className, grid = true }: SimpleBarChartProps) {
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div
        className={clsx(
          'flex h-full items-center justify-center rounded-lg border border-dashed border-neutral-200 text-sm text-neutral-400',
          className,
        )}
      >
        No data available
      </div>
    );
  }

  return (
    <div className={clsx('h-full w-full', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 16, right: 24, left: 8, bottom: 16 }}>
          {grid && (
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.3)" vertical={false} />
          )}
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: '#64748b' }}
            width={40}
          />
          <Tooltip
            cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }}
            wrapperStyle={{ outline: 'none' }}
            contentStyle={tooltipStyle}
            labelStyle={{ color: '#e2e8f0', fontWeight: 500 }}
            formatter={(value: number) => value.toLocaleString()}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`bar-${index}`} fill={entry.color ?? '#6366f1'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default SimpleBarChart;
