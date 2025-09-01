import React from 'react';
import Card from '../common/Card';

interface AssetsStatusChartProps {
  data?: Record<string, number>;
}

const AssetsStatusChart: React.FC<AssetsStatusChartProps> = ({ data }) => {
  const total = Object.values(data || {}).reduce((sum, v) => sum + (v || 0), 0);
  const calculatePercentage = (value: number) => {
    if (!total) return 0;
    return Math.round((value / total) * 100);
  };

  return (
    <Card title="Assets by Status" subtitle="Current asset distribution">
      <div className="space-y-4">
        {Object.entries(data || {}).map(([status, value]) => (
          <div key={status} className="flex items-center justify-between">
            <div className="w-full max-w-xs bg-neutral-100 rounded-full h-2.5" aria-hidden="true">
              <div
                className="bg-primary-600 h-2.5 rounded-full"
                style={{ width: `${calculatePercentage(value)}%` }}
              />
            </div>
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
