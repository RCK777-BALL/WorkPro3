/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import { cn } from '@/utils/cn';

interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  className?: string;
  barClassName?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max,
  label,
  className = '',
  barClassName = '',
}) => {
  const percentage = max > 0 ? Math.min(Math.max((value / max) * 100, 0), 100) : 0;
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      className={cn('w-full bg-neutral-200 rounded-full overflow-hidden', className)}
    >
      <div
        className={cn('h-full rounded-full', barClassName)}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

export default ProgressBar;
