/*
 * SPDX-License-Identifier: MIT
 */

import type { CSSProperties } from 'react';
import clsx from 'clsx';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

type LineDatum = {
  label: string;
  value: number;
};

type SimpleLineChartProps = {
  data: LineDatum[];
  className?: string;
  stroke?: string;
  showDots?: boolean;
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

export function SimpleLineChart({
  data,
  className,
  stroke = '#6366f1',
  showDots = false,
  grid = true,
}: SimpleLineChartProps) {
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
        <LineChart data={data} margin={{ top: 16, right: 24, left: 8, bottom: 16 }}>
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
            cursor={{ strokeDasharray: '3 3' }}
            wrapperStyle={{ outline: 'none' }}
            contentStyle={tooltipStyle}
            labelStyle={{ color: '#e2e8f0', fontWeight: 500 }}
            formatter={(value: number) => value.toLocaleString()}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={stroke}
            strokeWidth={2.5}
            dot={showDots}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default SimpleLineChart;
