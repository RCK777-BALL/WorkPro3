/*
 * SPDX-License-Identifier: MIT
 */

import type { CSSProperties } from 'react';

export interface SparklineProps {
  data: number[];
  color?: string;
  strokeWidth?: number;
  className?: string;
  style?: CSSProperties;
}

export function Sparkline({
  data,
  color = 'currentColor',
  strokeWidth = 2,
  className,
  style,
}: SparklineProps) {
  if (data.length === 0) {
    return null;
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const lastIndex = Math.max(data.length - 1, 1);

  const points = data
    .map((value, index) => {
      const x = (index / lastIndex) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={className}
      style={style}
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default Sparkline;
