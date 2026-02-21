/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import Card from '@/components/common/Card';

interface Props {
  label: string;
  value: number | string;
  suffix?: string;
  targetLabel?: string;
  status?: 'good' | 'warning' | 'critical';
  helperText?: string;
}

const statusStyles: Record<NonNullable<Props['status']>, string> = {
  good: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  critical: 'bg-red-100 text-red-700',
};

const KpiWidget: React.FC<Props> = ({ label, value, suffix, targetLabel, status, helperText }) => (
  <Card>
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</h3>
        {status && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyles[status]}`}>{status}</span>
        )}
      </div>
      <p className="text-2xl font-semibold">
        {value}
        {suffix}
      </p>
      {targetLabel && <p className="text-xs text-neutral-500 dark:text-neutral-400">Target: {targetLabel}</p>}
      {helperText && <p className="text-xs text-neutral-500 dark:text-neutral-400">{helperText}</p>}
    </div>
  </Card>
);

export default KpiWidget;
