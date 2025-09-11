import React from 'react';
import Card from '@/common/Card';
import ProgressBar from '@/common/ProgressBar';

interface WorkOrdersChartProps {
  data?: {
    open: number;
    inProgress: number;
    onHold: number;
    completed: number;
  };
}

const WorkOrdersChart: React.FC<WorkOrdersChartProps> = ({ data }) => {
  const total =
    (data?.open ?? 0) +
    (data?.inProgress ?? 0) +
    (data?.onHold ?? 0) +
    (data?.completed ?? 0);

  const calculatePercentage = (value: number) => {
    if (total === 0) {
      return 0;
    }
    return Math.round((value / total) * 100);
  };

  return (
    <Card title="Work Orders by Status" subtitle="Last 30 days performance">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <ProgressBar
            value={data?.open ?? 0}
            max={total}
            className="max-w-xs bg-neutral-100 h-2.5"
            barClassName="bg-primary-600"
            label="Open work orders"
          />
          <div className="ml-4 min-w-[80px]">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-primary-600 rounded-full mr-2"></div>
              <span className="text-sm font-medium">Open</span>
            </div>
            <span className="text-lg font-semibold">{data?.open ?? 0}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <ProgressBar
            value={data?.inProgress ?? 0}
            max={total}
            className="max-w-xs bg-neutral-100 h-2.5"
            barClassName="bg-accent-500"
            label="In progress work orders"
          />
          <div className="ml-4 min-w-[80px]">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-accent-500 rounded-full mr-2"></div>
              <span className="text-sm font-medium">In Progress</span>
            </div>
            <span className="text-lg font-semibold">{data?.inProgress ?? 0}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <ProgressBar
            value={data?.onHold ?? 0}
            max={total}
            className="max-w-xs bg-neutral-100 h-2.5"
            barClassName="bg-warning-500"
            label="On hold work orders"
          />
          <div className="ml-4 min-w-[80px]">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-warning-500 rounded-full mr-2"></div>
              <span className="text-sm font-medium">On Hold</span>
            </div>
            <span className="text-lg font-semibold">{data?.onHold ?? 0}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <ProgressBar
            value={data?.completed ?? 0}
            max={total}
            className="max-w-xs bg-neutral-100 h-2.5"
            barClassName="bg-success-500"
            label="Completed work orders"
          />
          <div className="ml-4 min-w-[80px]">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-success-500 rounded-full mr-2"></div>
              <span className="text-sm font-medium">Completed</span>
            </div>
            <span className="text-lg font-semibold">{data?.completed ?? 0}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-neutral-200">
        <div className="flex justify-between">
          <div>
            <p className="text-sm text-neutral-500">Total Work Orders</p>
            <p className="text-xl font-semibold">{total}</p>
          </div>
          <div>
            <p className="text-sm text-neutral-500">Completion Rate</p>
            <p className="text-xl font-semibold">{calculatePercentage(data?.completed ?? 0)}%</p>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default WorkOrdersChart;
