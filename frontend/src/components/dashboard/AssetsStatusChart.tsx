/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import Card from '@common/Card';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import type { AssetStatusMap } from '@/types';
 

interface AssetsStatusChartProps {
  data?: AssetStatusMap;
}

const AssetsStatusChart: React.FC<AssetsStatusChartProps> = ({ data }) => {
  const chartData = Object.entries(data || {}).map(([name, value]) => ({
    name,
    value: value ?? 0,
  }));
  const total = chartData.reduce((sum, d) => sum + d.value, 0);
  const COLORS = [
    '#3b82f6',
    '#f97316',
    '#10b981',
    '#ef4444',
    '#6366f1',
    '#8b5cf6',
  ];

  return (
    <Card title="Assets by Status" subtitle="Current asset distribution">
      <div className="h-64">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={80} paddingAngle={4}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-6 pt-6 border-t border-neutral-200">
        <p className="text-sm text-neutral-500">Total Assets</p>
        <p className="text-xl font-semibold">{total}</p>
      </div>
    </Card>
  );
};

export default AssetsStatusChart;
