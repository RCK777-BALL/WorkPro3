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
import {
  fetchMaintenanceSchedules,
  createMaintenanceSchedule,
  updateMaintenanceSchedule,
  deleteMaintenanceSchedule,
} from '@/api/maintenanceSchedules';

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === 'string' && error.trim().length > 0) {
    return error;
  }
  return fallback;
};

const Maintenance: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedSchedule, setSelectedSchedule] = useState<MaintenanceSchedule | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadSchedules = async () => {
      try {
        const data = await fetchMaintenanceSchedules();
        if (isMounted) {
          setSchedules(data);
        }
      } catch (error) {
        if (isMounted) {
          toast.error(getErrorMessage(error, 'Failed to load maintenance schedules'));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadSchedules();

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

  const handleCreateSchedule = useCallback(
    async (schedule: MaintenanceSchedule) => {
      const optimisticId = schedule.id;
      setSchedules((prev) => [...prev, schedule]);

      try {
        const saved = await createMaintenanceSchedule(schedule);
        setSchedules((prev) =>
          prev.map((item) => (item.id === optimisticId ? saved : item)),
        );
        toast.success('Maintenance schedule created');
      } catch (error) {
        setSchedules((prev) => prev.filter((item) => item.id !== optimisticId));
        throw new Error(getErrorMessage(error, 'Failed to create maintenance schedule'));
      }
    },
    [],
  );

  const handleUpdateSchedule = useCallback(
    async (schedule: MaintenanceSchedule) => {
      const previous = schedules.find((item) => item.id === schedule.id);
      if (!previous) {
        return;
      }

      setSchedules((prev) =>
        prev.map((item) => (item.id === schedule.id ? schedule : item)),
      );

      try {
        const saved = await updateMaintenanceSchedule(schedule.id, schedule);
        setSchedules((prev) =>
          prev.map((item) => (item.id === schedule.id ? saved : item)),
        );
        toast.success('Maintenance schedule updated');
      } catch (error) {
        setSchedules((prev) =>
          prev.map((item) => (item.id === schedule.id ? previous : item)),
        );
        throw new Error(getErrorMessage(error, 'Failed to update maintenance schedule'));
      }
    },
    [schedules],
  );

  const handleDeleteSchedule = useCallback(
    async (schedule: MaintenanceSchedule) => {
      const index = schedules.findIndex((item) => item.id === schedule.id);
      setSchedules((prev) => prev.filter((item) => item.id !== schedule.id));

      try {
        await deleteMaintenanceSchedule(schedule.id);
        toast.success('Maintenance schedule deleted');
      } catch (error) {
        setSchedules((prev) => {
          const next = [...prev];
          const targetIndex = index < 0 ? next.length : Math.min(index, next.length);
          next.splice(targetIndex, 0, schedule);
          return next;
        });
        throw new Error(getErrorMessage(error, 'Failed to delete maintenance schedule'));
      }
    },
    [schedules],
  );

  const handleSubmit = useCallback(
    async (schedule: MaintenanceSchedule) => {
      const exists = schedules.some((item) => item.id === schedule.id);
      if (exists) {
        await handleUpdateSchedule(schedule);
      } else {
        await handleCreateSchedule(schedule);
      }
    },
    [handleCreateSchedule, handleUpdateSchedule, schedules],
  );

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

        {isLoading ? (
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-8 text-center text-neutral-500">
            Loading maintenance schedules...
          </div>
        ) : (
          <MaintenanceScheduleTable
            schedules={schedules}
            search={search}
            onRowClick={handleOpenModal}
          />
        )}

        <MaintenanceModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          schedule={selectedSchedule}
          onSubmit={handleSubmit}
          onDelete={selectedSchedule ? handleDeleteSchedule : undefined}
        />
      </div>
  );
};

export default Maintenance;
