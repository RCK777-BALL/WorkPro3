/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface Props {
  value: string | number;
  label: string;
  trend?: 'up' | 'down';
}

const KpiTile: React.FC<Props> = ({ value, label, trend }) => (
  <div className="rounded-md border p-4 space-y-1">
    <div className="flex items-center">
      <span className="text-2xl font-semibold text-neutral-900 dark:text-white">{value}</span>
      {trend === 'up' && <ArrowUp size={16} className="ml-2 text-success-500" />}
      {trend === 'down' && <ArrowDown size={16} className="ml-2 text-error-500" />}
    </div>
    <p className="text-sm text-neutral-700 dark:text-neutral-300">{label}</p>
  </div>
);

export default KpiTile;
