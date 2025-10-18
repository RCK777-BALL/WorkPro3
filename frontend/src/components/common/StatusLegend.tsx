/*
 * SPDX-License-Identifier: MIT
 */

export function StatusLegend() {
  const statuses = [
    { label: 'Requested', color: 'bg-sky-500' },
    { label: 'Assigned', color: 'bg-indigo-500' },
    { label: 'In Progress', color: 'bg-yellow-500' },
    { label: 'Completed', color: 'bg-emerald-500' },
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
