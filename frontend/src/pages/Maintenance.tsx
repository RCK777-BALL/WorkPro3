/*
 * SPDX-License-Identifier: MIT
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Search, Calendar, Download, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/common/Button';
import MaintenanceScheduleTable from '@/components/maintenance/MaintenanceSchedule';
import MaintenanceModal from '@/components/maintenance/MaintenanceModal';
import MaintenanceMetrics from '@/components/maintenance/MaintenanceMetrics';
import { exportToExcel, exportToPDF } from '@/utils/export';
import type { MaintenanceSchedule } from '@/types';
import { getMaintenanceSchedules } from '@/api/maintenanceSchedules';

const Maintenance: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedSchedule, setSelectedSchedule] = useState<MaintenanceSchedule | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    getMaintenanceSchedules()
      .then((data) => {
        if (!isMounted) return;
        setSchedules(data);
      })
      .catch((err: unknown) => {
        console.error('Failed to load maintenance schedules', err);
        toast.error('Failed to load maintenance schedules. Please try again.');
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleOpenModal = (schedule: MaintenanceSchedule | null) => {
    setSelectedSchedule(schedule);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedSchedule(null);
  };

  const applyOptimisticSave = (
    schedule: MaintenanceSchedule,
    mode: 'create' | 'update',
  ) => {
    let previous: MaintenanceSchedule[] = [];
    setSchedules((current) => {
      previous = current;
      if (mode === 'create') {
        return [...current, schedule];
      }
      return current.map((item) => (item.id === schedule.id ? schedule : item));
    });

    return () => {
      setSchedules(previous);
    };
  };

  const finalizeSave = (
    optimisticId: string,
    saved: MaintenanceSchedule,
  ) => {
    setSchedules((current) =>
      current.map((item) => (item.id === optimisticId ? saved : item)),
    );
    setSelectedSchedule((current) =>
      current && current.id === optimisticId ? saved : current,
    );
  };

  const applyOptimisticDelete = (id: string) => {
    let previous: MaintenanceSchedule[] = [];
    setSchedules((current) => {
      previous = current;
      return current.filter((item) => item.id !== id);
    });

    return () => {
      setSchedules(previous);
    };
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
    <div className="space-y-6 text-[var(--wp-color-text)]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-[var(--wp-color-text)]">Maintenance</h2>
          <p className="text-[var(--wp-color-text-muted)]">Schedule and track preventive maintenance</p>
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
            className="border border-primary-500"
          >
            New Schedule
          </Button>
        </div>
      </div>

      <MaintenanceMetrics />

      <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4 bg-[var(--wp-color-surface)] p-4 rounded-lg shadow-sm border border-[var(--wp-color-border)]">
        <Search className="text-[var(--wp-color-text-muted)]" size={20} />
        <input
          type="text"
          placeholder="Search maintenance schedules..."
          className="flex-1 bg-transparent border-none outline-none text-[var(--wp-color-text)] placeholder-slate-500"
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
        />
      </div>

      <MaintenanceScheduleTable
        schedules={schedules}
        search={search}
        onRowClick={handleOpenModal}
        isLoading={isLoading}
      />

      <MaintenanceModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        schedule={selectedSchedule}
        onOptimisticSave={applyOptimisticSave}
        onFinalizeSave={finalizeSave}
        onOptimisticDelete={applyOptimisticDelete}
      />
    </div>
  );
};

export default Maintenance;

