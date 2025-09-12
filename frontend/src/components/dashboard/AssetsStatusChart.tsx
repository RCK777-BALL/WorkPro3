/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import Card from '@common/Card';
import ProgressBar from '@common/ProgressBar';
import type { AssetStatusMap } from '@/types';
 

interface AssetsStatusChartProps {
  data?: AssetStatusMap;
}

const AssetsStatusChart: React.FC<AssetsStatusChartProps> = ({ data }) => {
  const total = Object.values(data || {}).reduce(
    (sum: number, v: number) => sum + (v || 0),
    0,
  );

  return (
    <Card title="Assets by Status" subtitle="Current asset distribution">
      <div className="space-y-4">
        {Object.entries(data || {}).map(([status, value]) => (
          <div key={status} className="flex items-center justify-between">
            <ProgressBar
              value={value ?? 0}
              max={total}
              className="max-w-xs bg-neutral-100 h-2.5"
              barClassName="bg-primary-600"
              label={status}
            />
            <div className="ml-4 min-w-[80px]">
              <div className="flex items-center">
                <span className="text-sm font-medium capitalize">{status}</span>
              </div>
              <span className="text-lg font-semibold">{value}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t border-neutral-200">
        <div className="flex justify-between">
          <div>
            <p className="text-sm text-neutral-500">Total Assets</p>
            <p className="text-xl font-semibold">{total}</p>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default AssetsStatusChart;
