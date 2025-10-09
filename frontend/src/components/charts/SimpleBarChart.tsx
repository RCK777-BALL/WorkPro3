/*
 * SPDX-License-Identifier: MIT
 */

import type { CSSProperties } from 'react';

export interface SimpleBarDatum {
  label: string;
  value: number;
  color?: string;
}

export interface SimpleBarChartProps {
  data: SimpleBarDatum[];
  className?: string;
  style?: CSSProperties;
  barRadius?: number;
}

export function SimpleBarChart({
  data,
  className,
  style,
  barRadius = 4,
}: SimpleBarChartProps) {
  if (!data.length) {
    return null;
  }

  const max = Math.max(...data.map((d) => d.value), 1);
  const barWidth = 100 / data.length;
  const gap = Math.min(6, barWidth * 0.2);
  const usableWidth = barWidth - gap;

  return (
    <div className={className} style={style}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
        {data.map((datum, index) => {
          const height = (datum.value / max) * 90;
          const x = index * barWidth + gap / 2;
          const y = 100 - height;
          return (
            <rect
              key={datum.label}
              x={x}
              y={y}
              width={usableWidth}
              height={height}
              rx={barRadius}
              fill={datum.color ?? 'hsl(var(--primary))'}
            />
          );
        })}
      </svg>
      <div className="mt-2 grid grid-cols-[repeat(auto-fit,minmax(0,1fr))] gap-2 text-xs text-muted-foreground">
        {data.map((datum) => (
          <div key={datum.label} className="text-center">
            <div className="font-medium text-foreground">{datum.value}</div>
            <div>{datum.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SimpleBarChart;
