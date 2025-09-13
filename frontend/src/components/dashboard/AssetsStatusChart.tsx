/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import Card from '@common/Card';
import type { AssetStatusMap } from '@/types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
 

interface AssetsStatusChartProps {
  data?: AssetStatusMap;
}

const AssetsStatusChart: React.FC<AssetsStatusChartProps> = ({ data }) => {
  const chartData = Object.entries(data || {}).map(([name, value]) => ({
    name,
    value: value ?? 0,
  }));
  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  const COLORS = ['hsl(var(--primary))', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

  return (
    <Card title="Assets by Status" subtitle="Current asset distribution">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="name" label>
              {chartData.map((_, i) => (
                <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
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
