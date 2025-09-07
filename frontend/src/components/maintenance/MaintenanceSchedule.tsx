import React from 'react';
import Badge from '../common/Badge';
import { Calendar } from 'lucide-react';
import type { MaintenanceSchedule } from '../../types';

interface MaintenanceScheduleProps {
  schedules: MaintenanceSchedule[];
  search: string;
  onRowClick: (schedule: MaintenanceSchedule) => void;
}

const MaintenanceSchedule: React.FC<MaintenanceScheduleProps> = ({
  schedules,
  search,
  onRowClick,
}) => {
  const filteredSchedules = schedules.filter((schedule) =>
    Object.values(schedule).some((value) =>
      String(value).toLowerCase().includes(search.toLowerCase())
    )
  );

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-200">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Schedule
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Asset
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Frequency
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Last Completed
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Next Due
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Assigned To
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-neutral-200">
            {filteredSchedules.map((schedule) => (
              <tr
                key={schedule.id}
                className="hover:bg-neutral-50 cursor-pointer transition-colors duration-150"
                onClick={() => onRowClick(schedule)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="ml-4">
                      <div className="text-sm font-medium text-neutral-900">
                        {schedule.title}
                      </div>
                      <div className="text-sm text-neutral-500">
                        {schedule.id}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                  {schedule.assetId}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge
                    text={schedule.frequency}
                    size="sm"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-neutral-500">
                    <Calendar size={16} className="mr-2" />
                    {schedule.lastCompleted ? formatDate(schedule.lastCompleted) : 'Not completed'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-neutral-500">
                    <Calendar size={16} className="mr-2" />
                    {formatDate(schedule.nextDue)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                  {schedule.assignedTo || 'Unassigned'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {filteredSchedules.length === 0 && (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neutral-100 mb-4">
            <Calendar size={24} className="text-neutral-500" />
          </div>
          <p className="text-neutral-500">No maintenance schedules found</p>
        </div>
      )}
    </div>
  );
};

export default MaintenanceSchedule;
