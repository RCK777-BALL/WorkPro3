/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import Card from '@common/Card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

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
    { name: 'Open', value: data?.open ?? 0 },
    { name: 'In Progress', value: data?.inProgress ?? 0 },
    { name: 'On Hold', value: data?.onHold ?? 0 },
    { name: 'Completed', value: data?.completed ?? 0 },
  ];
  const total = chartData.reduce((sum, d) => sum + d.value, 0);
  const completionRate = total === 0 ? 0 : Math.round(((data?.completed ?? 0) / total) * 100);

  return (
    <Card title="Work Orders by Status" subtitle="Last 30 days performance">
      <div className="h-64">
        <ResponsiveContainer>
          <BarChart data={chartData}>
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-6 pt-6 border-t border-neutral-200">
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
