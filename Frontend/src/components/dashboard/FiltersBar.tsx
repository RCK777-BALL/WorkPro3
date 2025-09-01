import React from 'react';
import { useDashboardStore, Timeframe } from '../../store/dashboardStore';
import type { Department } from '../../types';

interface Props {
  departments: Department[];
}

const FiltersBar: React.FC<Props> = ({ departments }) => {
  const {
    selectedTimeframe,
    setSelectedTimeframe,
    customRange,
    setCustomRange,
    selectedDepartment,
    setSelectedDepartment,
    selectedRole,
    setSelectedRole,
  } = useDashboardStore();

  const handleTimeframeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedTimeframe(e.target.value as Timeframe);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <select
        value={selectedTimeframe}
        onChange={handleTimeframeChange}
        className="border border-neutral-300 rounded-md px-2 py-1 text-sm"
      >
        <option value="7d">Last 7 Days</option>
        <option value="30d">Last 30 Days</option>
        <option value="90d">Last 90 Days</option>
        <option value="ytd">Year to Date</option>
        <option value="custom">Custom</option>
      </select>
      {selectedTimeframe === 'custom' && (
        <>
          <input
            type="date"
            value={customRange.start}
            onChange={(e) => setCustomRange({ ...customRange, start: e.target.value })}
            className="border border-neutral-300 rounded-md px-2 py-1 text-sm"
          />
          <input
            type="date"
            value={customRange.end}
            onChange={(e) => setCustomRange({ ...customRange, end: e.target.value })}
            className="border border-neutral-300 rounded-md px-2 py-1 text-sm"
          />
        </>
      )}
      <select
        value={selectedDepartment}
        onChange={(e) => setSelectedDepartment(e.target.value)}
        className="border border-neutral-300 rounded-md px-2 py-1 text-sm"
      >
        <option value="all">All Departments</option>
        {departments.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
      <select
        value={selectedRole}
        onChange={(e) => setSelectedRole(e.target.value)}
        className="border border-neutral-300 rounded-md px-2 py-1 text-sm"
      >
        <option value="all">All Roles</option>
        <option value="admin">Admin</option>
        <option value="manager">Manager</option>
        <option value="technician">Technician</option>
        <option value="viewer">Viewer</option>
      </select>
    </div>
  );
};

export default FiltersBar;
