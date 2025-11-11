/*
 * SPDX-License-Identifier: MIT
 */

import type { CSSProperties } from 'react';
import clsx from 'clsx';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';

export type PieDatum = {
  label: string;
  value: number;
  color?: string;
};

export type SimplePieChartProps = {
  data: PieDatum[];
  className?: string;
  innerRadius?: number | string;
  outerRadius?: number | string;
};

const tooltipStyle: CSSProperties = {
  backgroundColor: 'rgba(17, 24, 39, 0.9)',
  border: 'none',
  color: '#f9fafb',
  borderRadius: '0.375rem',
  padding: '0.5rem 0.75rem',
  fontSize: '0.875rem',
};

export function SimplePieChart({
  data,
  className,
  innerRadius = '45%',
  outerRadius = '75%',
}: SimplePieChartProps) {
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
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={4}
          >
            {data.map((entry, index) => (
              <Cell key={`slice-${index}`} fill={entry.color ?? '#6366f1'} />
            ))}
          </Pie>
          <Tooltip
            cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }}
            wrapperStyle={{ outline: 'none' }}
            contentStyle={tooltipStyle}
            formatter={(value: number, name: string) => [value.toLocaleString(), name]}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default SimplePieChart;
