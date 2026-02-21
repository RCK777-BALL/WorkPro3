/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import Card from '@/components/common/Card';
import { SimpleBarChart } from '@/components/charts/SimpleBarChart';


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
    { label: 'Open', value: data?.open ?? 0, color: 'hsl(var(--primary))' },
    { label: 'In Progress', value: data?.inProgress ?? 0, color: '#06b6d4' },
    { label: 'On Hold', value: data?.onHold ?? 0, color: '#f59e0b' },
    { label: 'Completed', value: data?.completed ?? 0, color: '#10b981' },
  ];
  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  const completionRate = total === 0 ? 0 : Math.round(((data?.completed ?? 0) / total) * 100);


  return (
    <Card title="Work Orders by Status" subtitle="Last 30 days performance">
      <div className="h-64">
        <SimpleBarChart data={chartData} className="h-full" />
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
