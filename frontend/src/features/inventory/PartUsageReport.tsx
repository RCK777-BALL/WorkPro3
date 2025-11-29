/*
 * SPDX-License-Identifier: MIT
 */

import { useMemo } from 'react';
import { BarChart3, Boxes, CircleDollarSign, ListChecks } from 'lucide-react';

import SimpleBarChart from '@/components/charts/SimpleBarChart';
import { usePartUsageReport } from './hooks';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

const StatCard = ({
  label,
  value,
  icon: Icon,
  description,
}: {
  label: string;
  value: string;
  icon: typeof BarChart3;
  description?: string;
}) => (
  <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
    <div className="rounded-full bg-primary-50 p-2 text-primary-600">
      <Icon size={20} />
    </div>
    <div>
      <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="text-2xl font-semibold text-neutral-900">{value}</p>
      {description ? <p className="text-xs text-neutral-500">{description}</p> : null}
    </div>
  </div>
);

const EmptyState = () => (
  <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-neutral-200 bg-white text-neutral-500">
    No part usage found yet.
  </div>
);

export default function PartUsageReport() {
  const reportQuery = usePartUsageReport();

  const topCostParts = useMemo(() => {
    if (!reportQuery.data?.parts?.length) return [];
    return [...reportQuery.data.parts].sort((a, b) => b.totalCost - a.totalCost).slice(0, 5);
  }, [reportQuery.data?.parts]);

  const usageTable = useMemo(() => {
    if (!reportQuery.data?.parts?.length) return [];
    return [...reportQuery.data.parts].sort((a, b) => b.totalQuantity - a.totalQuantity);
  }, [reportQuery.data?.parts]);

  if (reportQuery.isLoading) {
    return <div className="rounded-lg border border-neutral-200 bg-white p-6 text-neutral-500">Loading inventory analytics…</div>;
  }

  if (reportQuery.isError || !reportQuery.data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        Unable to load part usage analytics. Please try again later.
      </div>
    );
  }

  const { summary } = reportQuery.data;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Parts consumed"
          value={summary.totalQuantity.toLocaleString()}
          icon={Boxes}
          description="Total quantity used across completed work orders"
        />
        <StatCard
          label="Consumption cost"
          value={formatCurrency(summary.totalCost)}
          icon={CircleDollarSign}
          description="Sum of quantity multiplied by part cost"
        />
        <StatCard
          label="Distinct parts"
          value={summary.distinctParts.toLocaleString()}
          icon={ListChecks}
          description="Unique parts consumed"
        />
        <StatCard
          label="Work orders"
          value={summary.workOrders.toLocaleString()}
          icon={BarChart3}
          description="Work orders where parts were used"
        />
      </div>

      {!usageTable.length ? (
        <EmptyState />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.4fr,1fr]">
          <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-neutral-900">Usage by part</h3>
                <p className="text-sm text-neutral-500">Quantities and costs pulled from completed work orders.</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200 text-left text-sm">
                <thead className="bg-neutral-50 text-neutral-600">
                  <tr>
                    <th className="px-4 py-2 font-medium">Part</th>
                    <th className="px-4 py-2 font-medium">Quantity used</th>
                    <th className="px-4 py-2 font-medium">Cost</th>
                    <th className="px-4 py-2 font-medium">Work orders</th>
                    <th className="px-4 py-2 font-medium">Last used</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-neutral-800">
                  {usageTable.map((part) => (
                    <tr key={part.partId} className="hover:bg-neutral-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-neutral-900">{part.partName}</div>
                        {part.partNumber ? (
                          <div className="text-xs text-neutral-500">Part #{part.partNumber}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 font-semibold">{part.totalQuantity.toLocaleString()}</td>
                      <td className="px-4 py-3 font-semibold">{formatCurrency(part.totalCost)}</td>
                      <td className="px-4 py-3">{part.workOrderCount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-neutral-600">
                        {part.lastUsedAt ? new Date(part.lastUsedAt).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-neutral-900">Cost by part</h3>
                <p className="text-sm text-neutral-500">Top parts ranked by total consumption cost.</p>
              </div>
            </div>
            <div className="h-72">
              <SimpleBarChart
                data={topCostParts.map((part) => ({
                  label: part.partName.length > 18 ? `${part.partName.slice(0, 18)}…` : part.partName,
                  value: Math.round(part.totalCost),
                }))}
              />
            </div>
            <div className="mt-4 space-y-3">
              {topCostParts.map((part) => (
                <div key={part.partId} className="flex items-center justify-between rounded-lg bg-neutral-50 p-3">
                  <div>
                    <div className="font-medium text-neutral-900">{part.partName}</div>
                    <p className="text-xs text-neutral-500">{part.totalQuantity.toLocaleString()} units</p>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-neutral-900">{formatCurrency(part.totalCost)}</div>
                    <p className="text-xs text-neutral-500">{formatCurrency(part.unitCost ?? 0)} each</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
