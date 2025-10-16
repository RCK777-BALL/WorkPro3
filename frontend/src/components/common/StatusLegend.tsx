/*
 * SPDX-License-Identifier: MIT
 */

export function StatusLegend() {
  const statuses = [
    { label: 'Open', color: 'bg-red-500' },
    { label: 'In Progress', color: 'bg-yellow-500' },
    { label: 'Pending Approval', color: 'bg-purple-500' },
    { label: 'Completed', color: 'bg-green-500' },
    { label: 'On Hold', color: 'bg-gray-500' },
    { label: 'Cancelled', color: 'bg-slate-400' },
  ];

  return (
    <div className="flex flex-wrap gap-3 mt-4">
      {statuses.map((status) => (
        <div key={status.label} className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${status.color}`} />
          <span className="text-sm text-gray-300">{status.label}</span>
        </div>
      ))}
    </div>
  );
}

export default StatusLegend;
