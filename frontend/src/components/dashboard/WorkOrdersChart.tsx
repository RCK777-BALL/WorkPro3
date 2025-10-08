/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import Card from '@common/Card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';


interface WorkOrdersChartProps {
  data?: {
    open: number;
    inProgress: number;
    onHold: number;
    completed: number;
  };
}

const WorkOrdersChart: React.FC<WorkOrdersChartProps> = ({ data }) => {
  const chartData = [
    { name: 'Open', value: data?.open ?? 0, fill: 'hsl(var(--primary))' },
    { name: 'In Progress', value: data?.inProgress ?? 0, fill: '#06b6d4' },
    { name: 'On Hold', value: data?.onHold ?? 0, fill: '#f59e0b' },
    { name: 'Completed', value: data?.completed ?? 0, fill: '#10b981' },
  ];
  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  const calculatePercentage = (value: number) => {
    if (total === 0) {
      return 0;
    }
    return Math.round((value / total) * 100);
  };


  return (
    <Card title="Work Orders by Status" subtitle="Last 30 days performance">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="value">
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 pt-6 border-t border-border">

        <div className="flex justify-between">
          <div>
            <p className="text-sm text-neutral-500">Total Work Orders</p>
            <p className="text-xl font-semibold">{total}</p>
          </div>
          <div>
            <p className="text-sm text-neutral-500">Completion Rate</p>
            <p className="text-xl font-semibold">{completionRate}%</p>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default WorkOrdersChart;
