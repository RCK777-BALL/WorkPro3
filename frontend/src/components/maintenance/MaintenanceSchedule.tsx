/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import Badge from '@/components/common/Badge';
import { Calendar } from 'lucide-react';
import type { MaintenanceSchedule } from '@/types';

interface MaintenanceScheduleProps {
  schedules: MaintenanceSchedule[];
  search: string;
  onRowClick: (schedule: MaintenanceSchedule) => void;
  isLoading?: boolean;
}

const MaintenanceSchedule: React.FC<MaintenanceScheduleProps> = ({
  schedules,
  search,
  onRowClick,
  isLoading = false,
}) => {
  const filteredSchedules = schedules.filter((schedule) =>
    Object.values(schedule).some((value) =>
      String(value).toLowerCase().includes(search.toLowerCase())
    )
  );

  const showLoading = isLoading && schedules.length === 0;

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-slate-900 rounded-lg shadow-sm border border-slate-800 overflow-hidden text-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-800">
          <thead className="bg-slate-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                Schedule
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                Asset
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                Frequency
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                Last Completed
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                Next Due
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                Assigned To
              </th>
            </tr>
          </thead>
          <tbody className="bg-slate-900 divide-y divide-slate-800">
            {showLoading && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm text-white/70">
                  Loading maintenance schedules...
                </td>
              </tr>
            )}
            {!showLoading && filteredSchedules.map((schedule) => (
              <tr
                key={schedule.id}
                className="hover:bg-slate-800 cursor-pointer transition-colors duration-150"
                onClick={() => onRowClick(schedule)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="ml-4">
                      <div className="text-sm font-medium text-white">
                        {schedule.title}
                      </div>
                      <div className="text-sm text-white/70">
                        {schedule.id}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white/70">
                  {schedule.assetId}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge
                    text={schedule.frequency}
                    size="sm"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-white/70">
                    <Calendar size={16} className="mr-2 text-white/70" />
                    {schedule.lastCompleted ? formatDate(schedule.lastCompleted) : 'Not completed'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-white/70">
                    <Calendar size={16} className="mr-2 text-white/70" />
                    {formatDate(schedule.nextDue)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white/70">
                  {schedule.assignedTo || 'Unassigned'}
                </td>
              </tr>
            ))}
            {!showLoading && filteredSchedules.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-white/70">
                  No maintenance schedules match your search
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!showLoading && filteredSchedules.length === 0 && (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800 mb-4">
            <Calendar size={24} className="text-white/70" />
          </div>
          <p className="text-white/70">No maintenance schedules found</p>
        </div>
      )}
    </div>
  );
};

export default MaintenanceSchedule;
