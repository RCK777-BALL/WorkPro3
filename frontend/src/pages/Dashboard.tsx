/*
 * SPDX-License-Identifier: MIT
 */

import Card from '@common/Card';
import StatusBadge from '@common/StatusBadge';

const kpis = [
  { label: 'Open Work Orders', value: 12 },
  { label: 'Assets Online', value: 128 },
  { label: 'Maintenance Due', value: 7 },
  { label: 'Team Members', value: 24 },
];

const sample = [
  { id: 1, name: 'HVAC System', status: 'Active' },
  { id: 2, name: 'Conveyor Belt', status: 'In Repair' },
  { id: 3, name: 'Packaging Line', status: 'Offline' },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          Overview of key metrics and recent items
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="text-center">
            <div className="text-sm text-neutral-600 dark:text-neutral-400">
              {kpi.label}
            </div>
            <div className="mt-2 text-2xl font-semibold">{kpi.value}</div>
          </Card>
        ))}
      </div>

      <Card noPadding>
        <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700 text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-800">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Item</th>
              <th className="px-4 py-2 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
            {sample.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-2">{row.name}</td>
                <td className="px-4 py-2">
                  <StatusBadge status={row.status} size="sm" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

