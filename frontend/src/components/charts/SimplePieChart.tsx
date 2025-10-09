/*
 * SPDX-License-Identifier: MIT
 */

import type { CSSProperties } from 'react';

export interface SimplePieDatum {
  label: string;
  value: number;
  color: string;
}

export interface SimplePieChartProps {
  data: SimplePieDatum[];
  className?: string;
  style?: CSSProperties;
}

export function SimplePieChart({ data, className, style }: SimplePieChartProps) {
  if (!data.length) {
    return null;
  }

  const total = data.reduce((sum, datum) => sum + datum.value, 0) || 1;
  let current = 0;
  const segments = data.map((datum) => {
    const start = (current / total) * 360;
    current += datum.value;
    const end = (current / total) * 360;
    return `${datum.color} ${start}deg ${end}deg`;
  });

  const gradient = `conic-gradient(${segments.join(', ')})`;

  return (
    <div className={className} style={style}>
      <div
        className="mx-auto aspect-square h-full max-h-64 w-full max-w-xs rounded-full border border-border"
        style={{ backgroundImage: gradient }}
      />
      <div className="mt-4 space-y-2 text-sm">
        {data.map((datum) => (
          <div key={datum.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 rounded"
                style={{ backgroundColor: datum.color }}
              />
              <span className="text-muted-foreground">{datum.label}</span>
            </div>
            <span className="font-medium text-foreground">{datum.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SimplePieChart;
