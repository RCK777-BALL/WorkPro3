/*
 * SPDX-License-Identifier: MIT
 */

import clsx from "clsx";

export type SparklineProps = {
  data: number[];
  color?: string;
  strokeWidth?: number;
  className?: string;
  ariaLabel?: string;
};

const DEFAULT_COLOR = "#6366f1";

export function Sparkline({
  data,
  color = DEFAULT_COLOR,
  strokeWidth = 2,
  className,
  ariaLabel = "Trend over time",
}: SparklineProps) {
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div
        role="img"
        aria-label="No data to render"
        className={clsx(
          "flex items-center justify-center rounded-lg border border-dashed border-neutral-200 text-xs text-neutral-400 dark:border-neutral-700 dark:text-neutral-500",
          className,
        )}
      >
        No data
      </div>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1 || 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      className={clsx("h-16 w-full", className)}
      viewBox="0 0 100 100"
      role="img"
      aria-label={ariaLabel}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="sparkline-gradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.4} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polyline
        points={`0,100 ${points} 100,100`}
        fill="url(#sparkline-gradient)"
        stroke="none"
        strokeLinejoin="round"
      />
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
