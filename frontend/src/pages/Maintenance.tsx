/*
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useState } from 'react';
import { Plus, Search, Calendar, Download, Upload } from 'lucide-react';
import Button from '@/components/common/Button';
import MaintenanceScheduleTable from '@/components/maintenance/MaintenanceSchedule';
import MaintenanceModal from '@/components/maintenance/MaintenanceModal';
import MaintenanceMetrics from '@/components/maintenance/MaintenanceMetrics';
import { exportToExcel, exportToPDF } from '@/utils/export';
import type { MaintenanceSchedule } from '@/types';

const sampleSchedules: MaintenanceSchedule[] = [
  {
    id: 'MS-2024-001',
    assetId: 'CVB-A1',
    title: 'Monthly Belt Inspection',
    description: 'Inspect belt tension, wear, and alignment. Lubricate bearings.',
    frequency: 'monthly',
    lastCompleted: '2024-02-15',
    nextDue: '2024-03-15',
    assignedTo: 'Mike Johnson',
    instructions: '1. Check belt tension\n2. Inspect for wear\n3. Verify alignment\n4. Lubricate bearings',
    type: 'preventive',
    estimatedDuration: 2,
    repeatConfig: { interval: 1, unit: 'month' },
    parts: []
  },
  {
    id: 'MS-2024-002',
    assetId: 'HVAC-01',
    title: 'Quarterly HVAC Maintenance',
    description: 'Full system inspection and filter replacement',
    frequency: 'quarterly',
    lastCompleted: '2024-01-01',
    nextDue: '2024-04-01',
    assignedTo: 'Sarah Wilson',
    instructions: '1. Replace filters\n2. Clean coils\n3. Check refrigerant levels\n4. Test operation',
    type: 'preventive',
    estimatedDuration: 4,
    repeatConfig: { interval: 3, unit: 'month' },
    parts: []
  }
];

const LOCAL_KEY = 'maintenance-schedules';

const Maintenance: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedSchedule, setSelectedSchedule] = useState<MaintenanceSchedule | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>(() => {
    if (typeof window === 'undefined') return sampleSchedules;
    const stored = localStorage.getItem(LOCAL_KEY);
    return stored ? JSON.parse(stored) : sampleSchedules;
  });

  useEffect(() => {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(schedules));
  }, [schedules]);

  const handleOpenModal = (schedule: MaintenanceSchedule | null) => {
    setSelectedSchedule(schedule);
    setModalOpen(true);
  };

  const scheduleMapper = (schedule: MaintenanceSchedule) => ({
    ID: schedule.id,
    Title: schedule.title,
    Asset: schedule.assetId,
    Frequency: schedule.frequency,
    'Next Due': schedule.nextDue,
    'Last Completed': schedule.lastCompleted ?? '',
    'Assigned To': schedule.assignedTo ?? '',
    'Estimated Duration': schedule.estimatedDuration
  });

  const handleExportExcel = async () => {
    await exportToExcel<MaintenanceSchedule>(schedules, 'maintenance-schedules', scheduleMapper);
  };

  const handleExportPDF = () => {
    exportToPDF<MaintenanceSchedule>(schedules, 'maintenance-schedules', scheduleMapper);
  };

  return (
          <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-neutral-900">Maintenance</h2>
            <p className="text-neutral-500">Schedule and track preventive maintenance</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:space-x-3">
            <Button
              variant="outline"
              icon={<Calendar size={16} />}
              onClick={() => {}}
            >
              Calendar View
            </Button>
            <Button
              variant="outline"
              icon={<Download size={16} />}
              onClick={handleExportExcel}
            >
              Export Excel
            </Button>
            <Button
              variant="outline"
              icon={<Upload size={16} />}
              onClick={handleExportPDF}
            >
              Export PDF
            </Button>
            <Button
              variant="primary"
              icon={<Plus size={16} />}
              onClick={() => handleOpenModal(null)}
            >
              New Schedule
            </Button>
          </div>
        </div>

        <MaintenanceMetrics />

        <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4 bg-white p-4 rounded-lg shadow-sm border border-neutral-200">
          <Search className="text-neutral-500" size={20} />
          <input
            type="text"
            placeholder="Search maintenance schedules..."
            className="flex-1 bg-transparent border-none outline-none text-neutral-900 placeholder-neutral-400"
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          />
        </div>

        <MaintenanceScheduleTable
          schedules={schedules}
          search={search}
          onRowClick={handleOpenModal}
        />

        <MaintenanceModal
          isOpen={isModalOpen}
          onClose={() => setModalOpen(false)}
          schedule={selectedSchedule}
          onUpdate={(updatedSchedule) => {
            setSchedules(prevSchedules => {
              const index = prevSchedules.findIndex(
                schedule => schedule.id === updatedSchedule.id
              );
              if (index === -1) {
                return [...prevSchedules, updatedSchedule];
              }
              return prevSchedules.map(schedule =>
                schedule.id === updatedSchedule.id ? updatedSchedule : schedule
              );
            });
            setModalOpen(false);
          }}
        />
      </div>
  );
};

export default Maintenance;
