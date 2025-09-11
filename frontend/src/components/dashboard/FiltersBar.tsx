/*
 * SPDX-License-Identifier: MIT
 */

import React, { useState } from 'react';
import { useDashboardStore, Timeframe } from '@/store/dashboardStore';
import type { Department } from '@/types';

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

  const [rangeError, setRangeError] = useState('');

  const handleTimeframeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedTimeframe(e.target.value as Timeframe);
  };

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const start = e.target.value;
    if (customRange.end && start > customRange.end) {
      setRangeError('Start date must be before end date');
      return;
    }
    setRangeError('');
    setCustomRange({ ...customRange, start });
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const end = e.target.value;
    if (customRange.start && end < customRange.start) {
      setRangeError('End date must be after start date');
      return;
    }
    setRangeError('');
    setCustomRange({ ...customRange, end });
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
            onChange={handleStartChange}
            className="border border-neutral-300 rounded-md px-2 py-1 text-sm"
          />
          <input
            type="date"
            value={customRange.end}
            onChange={handleEndChange}
            className="border border-neutral-300 rounded-md px-2 py-1 text-sm"
          />
          {rangeError && <p className="text-red-500 text-xs">{rangeError}</p>}
        </>
      )}
      <select
        value={selectedDepartment}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedDepartment(e.target.value)}
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
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedRole(e.target.value)}
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
