/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import Card from '@/components/common/Card';

import type { AssetStatusMap } from '@/types';
import SimplePieChart from '@/components/charts/SimplePieChart';
 

interface AssetsStatusChartProps {
  data?: AssetStatusMap;
}

const AssetsStatusChart: React.FC<AssetsStatusChartProps> = ({ data }) => {
  const COLORS = ['hsl(var(--primary))', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

  const chartData = Object.entries(data || {}).map(([name, value], index) => ({
    label: name,
    value: value ?? 0,
    color: COLORS[index % COLORS.length],
  }));
  const total = chartData.reduce((sum, item) => sum + item.value, 0);
  return (
    <Card title="Assets by Status" subtitle="Current asset distribution">
      <div className="h-64">
        <SimplePieChart data={chartData} className="h-full" />
      </div>

      <div className="mt-6 pt-6 border-t border-border">
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
