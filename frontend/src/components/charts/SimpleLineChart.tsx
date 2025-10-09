/*
 * SPDX-License-Identifier: MIT
 */

import type { CSSProperties } from 'react';

export interface SimpleLineDatum {
  label: string;
  value: number;
}

export interface SimpleLineChartProps {
  data: SimpleLineDatum[];
  stroke?: string;
  strokeWidth?: number;
  className?: string;
  style?: CSSProperties;
  showDots?: boolean;
}

export function SimpleLineChart({
  data,
  stroke = 'hsl(var(--primary))',
  strokeWidth = 2,
  className,
  style,
  showDots = false,
}: SimpleLineChartProps) {
  if (!data.length) {
    return null;
  }

  const max = Math.max(...data.map((d) => d.value));
  const min = Math.min(...data.map((d) => d.value));
  const range = max - min || 1;
  const lastIndex = Math.max(data.length - 1, 1);

  const points = data
    .map((datum, index) => {
      const x = (index / lastIndex) * 100;
      const y = 100 - ((datum.value - min) / range) * 90 - 5;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className={className} style={style}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
          <polyline
            points={points}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {showDots
            ? data.map((datum, index) => {
              const x = (index / lastIndex) * 100;
              const y = 100 - ((datum.value - min) / range) * 90 - 5;
              return <circle key={datum.label} cx={x} cy={y} r={1.5} fill={stroke} />;
            })
          : null}
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

export default SimpleLineChart;
