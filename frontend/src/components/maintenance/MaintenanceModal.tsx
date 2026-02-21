/*
 * SPDX-License-Identifier: MIT
 */

import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/common/Button';
import type { MaintenanceSchedule } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import {
  createMaintenanceSchedule,
  updateMaintenanceSchedule,
  deleteMaintenanceSchedule,
} from '@/api/maintenanceSchedules';

const createDefaultSchedule = (): MaintenanceSchedule => ({
  id: uuidv4(),
  title: '',
  description: '',
  assetId: '',
  frequency: 'monthly',
  nextDue: new Date().toISOString().split('T')[0],
  estimatedDuration: 1,
  instructions: '',
  type: 'preventive',
  repeatConfig: {
    interval: 1,
    unit: 'month',
  },
  parts: [],
});

interface MaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: MaintenanceSchedule | null;
  onOptimisticSave: (
    schedule: MaintenanceSchedule,
    mode: 'create' | 'update',
  ) => () => void;
  onFinalizeSave: (optimisticId: string, saved: MaintenanceSchedule) => void;
  onOptimisticDelete: (id: string) => () => void;
}

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === 'string' && error.trim().length > 0) {
    return error;
  }
  return fallback;
};

const MaintenanceModal: React.FC<MaintenanceModalProps> = ({
  isOpen,
  onClose,
  schedule,
  onOptimisticSave,
  onFinalizeSave,
  onOptimisticDelete,
}) => {
  const [formData, setFormData] = useState<MaintenanceSchedule>(
    schedule ?? createDefaultSchedule()
  );

  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const labelClass = 'block text-sm font-medium text-white mb-1';
  const inputClass =
    'w-full px-3 py-2 border border-slate-700 rounded-md bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40';
  const selectClass = inputClass;
  const textareaClass =
    'w-full px-3 py-2 border border-slate-700 rounded-md bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40';
  const mutedTextClass = 'text-sm text-white/70';

  useEffect(() => {
    if (schedule) {

      setFormData(schedule);
    } else {
      setFormData({
        id: uuidv4(),
        title: '',
        description: '',
        assetId: '',
        frequency: 'monthly',
        nextDue: new Date().toISOString().split('T')[0],
        estimatedDuration: 1,
        instructions: '',
        type: 'preventive',
        repeatConfig: {
          interval: 1,
          unit: 'month',
        },
        parts: [],
      });
    }
    setShowAdvancedOptions(false);
    setIsSaving(false);
    setIsDeleting(false);
  }, [schedule, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const mode = schedule ? 'update' : 'create';
    const optimisticSchedule = { ...formData };
    const rollback = onOptimisticSave(optimisticSchedule, mode);

    setIsSaving(true);
    try {
      const payload = {
        ...optimisticSchedule,
        repeatConfig: {
          ...optimisticSchedule.repeatConfig,
          endDate: optimisticSchedule.repeatConfig.endDate || undefined,
          occurrences: optimisticSchedule.repeatConfig.occurrences || undefined,
        },
        parts: optimisticSchedule.parts ?? [],
        lastCompleted: optimisticSchedule.lastCompleted || undefined,
        lastCompletedBy: optimisticSchedule.lastCompletedBy?.trim() || undefined,
        assignedTo: optimisticSchedule.assignedTo?.trim() || undefined,
      };

      const saved = schedule
        ? await updateMaintenanceSchedule(optimisticSchedule.id, payload)
        : await createMaintenanceSchedule(payload);

      onFinalizeSave(optimisticSchedule.id, saved);
      toast.success(
        schedule
          ? 'Maintenance schedule updated successfully.'
          : 'Maintenance schedule created successfully.',
      );
      onClose();
    } catch (err) {
      console.error('Failed to save maintenance schedule', err);
      rollback();
      toast.error('Failed to save maintenance schedule. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!schedule) return;
    const confirmed = window.confirm(
      'Are you sure you want to delete this maintenance schedule?',
    );
    if (!confirmed) return;

    const rollback = onOptimisticDelete(schedule.id);
    setIsDeleting(true);
    try {
      await deleteMaintenanceSchedule(schedule.id);
      toast.success('Maintenance schedule deleted successfully.');
      onClose();
    } catch (err) {
      console.error('Failed to delete maintenance schedule', err);
      rollback();
      toast.error('Failed to delete maintenance schedule. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const calculateNextDueDate = (date: string, frequency: string) => {
    const baseDate = new Date(date);
    switch (frequency) {
      case 'daily':
        baseDate.setDate(baseDate.getDate() + 1);
        break;
      case 'weekly':
        baseDate.setDate(baseDate.getDate() + 7);
        break;
      case 'monthly':
        baseDate.setMonth(baseDate.getMonth() + 1);
        break;
      case 'quarterly':
        baseDate.setMonth(baseDate.getMonth() + 3);
        break;
      case 'biannually':
        baseDate.setMonth(baseDate.getMonth() + 6);
        break;
      case 'annually':
        baseDate.setFullYear(baseDate.getFullYear() + 1);
        break;
    }
    return baseDate.toISOString().split('T')[0];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-900 text-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-slate-700">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-white">
            {schedule ? 'Edit Maintenance Schedule' : 'Create Maintenance Schedule'}
          </h2>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white"
            disabled={isSaving || isDeleting}
            aria-disabled={isSaving || isDeleting}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>
                Title
              </label>
              <input
                type="text"
                className={inputClass}
                value={formData.title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div>
              <label className={labelClass}>
                Asset ID
              </label>
              <input
                type="text"
                className={inputClass}
                value={formData.assetId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, assetId: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>
              Description
            </label>
            <textarea
              className={textareaClass}
              rows={4}
              value={formData.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>
                Type
              </label>
              <select
                className={selectClass}
                value={formData.type}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="preventive">Preventive Maintenance</option>
                <option value="corrective">Corrective Maintenance</option>
                <option value="inspection">Inspection</option>
                <option value="calibration">Calibration</option>
                <option value="safety">Safety Check</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>
                Frequency
              </label>
              <select
                className={selectClass}
                value={formData.frequency}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                  const newFrequency = e.target.value;
                  setFormData({
                    ...formData,
                    frequency: newFrequency,
                    nextDue: calculateNextDueDate(formData.nextDue, newFrequency)
                  });
                }}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="biannually">Biannually</option>
                <option value="annually">Annually</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>
                Start Date
              </label>
              <input
                type="date"
                className={inputClass}
                value={formData.nextDue}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, nextDue: e.target.value })}
              />
            </div>

            <div>
              <label className={labelClass}>
                Estimated Duration (hours)
              </label>
              <input
                type="number"
                className={inputClass}
                value={formData.estimatedDuration}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, estimatedDuration: parseInt(e.target.value) })}
                min="0"
                step="0.5"
              />
            </div>
          </div>

          <div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="mb-4"
            >
              {showAdvancedOptions ? 'Hide' : 'Show'} Advanced Options
            </Button>

            {showAdvancedOptions && (
              <div className="space-y-4 p-4 bg-slate-800 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelClass}>
                      Repeat Every
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="number"
                        className={`${inputClass} w-20`}
                        value={formData.repeatConfig.interval}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({
                          ...formData,
                          repeatConfig: {
                            ...formData.repeatConfig,
                            interval: parseInt(e.target.value)
                          }
                        })}
                        min="1"
                      />
                      <select
                        className={`${selectClass} flex-1`}
                        value={formData.repeatConfig.unit}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                          setFormData({
                            ...formData,
                            repeatConfig: {
                              ...formData.repeatConfig,
                              unit: e.target.value as 'day' | 'week' | 'month',
                            },
                          })
                        }
                      >
                        <option value="day">Days</option>
                        <option value="week">Weeks</option>
                        <option value="month">Months</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>
                      End
                    </label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="endType"
                          checked={!formData.repeatConfig.endDate && !formData.repeatConfig.occurrences}
                          onChange={() => setFormData({
                            ...formData,
                            repeatConfig: {
                              ...formData.repeatConfig,
                              endDate: '',
                              occurrences: 0
                            }
                          })}
                        />
                        <span className={mutedTextClass}>Never</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="endType"
                          checked={!!formData.repeatConfig.endDate}
                          onChange={() => setFormData({
                            ...formData,
                            repeatConfig: {
                              ...formData.repeatConfig,
                              endDate: new Date().toISOString().split('T')[0],
                              occurrences: 0
                            }
                          })}
                        />
                        <span className={mutedTextClass}>On</span>
                        <input
                          type="date"
                          className={`${inputClass} flex-1`}
                          value={formData.repeatConfig.endDate}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({
                            ...formData,
                            repeatConfig: {
                              ...formData.repeatConfig,
                              endDate: e.target.value,
                              occurrences: 0
                            }
                          })}
                          disabled={!formData.repeatConfig.endDate}
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="endType"
                          checked={!!formData.repeatConfig.occurrences}
                          onChange={() => setFormData({
                            ...formData,
                            repeatConfig: {
                              ...formData.repeatConfig,
                              endDate: '',
                              occurrences: 1
                            }
                          })}
                        />
                        <span className={mutedTextClass}>After</span>
                        <input
                          type="number"
                          className={`${inputClass} w-20`}
                          value={formData.repeatConfig.occurrences || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({
                            ...formData,
                            repeatConfig: {
                              ...formData.repeatConfig,
                              endDate: '',
                              occurrences: parseInt(e.target.value)
                            }
                          })}
                          min="1"
                          disabled={!formData.repeatConfig.occurrences}
                        />
                        <span className={mutedTextClass}>occurrences</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center space-x-2 text-white">
                    <AlertTriangle size={16} className="text-warning-400" />
                    <span className="text-sm">
                      Changes to the schedule will affect all future occurrences
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className={labelClass}>
              Instructions
            </label>
            <textarea
              className={textareaClass}
              rows={6}
              value={formData.instructions}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, instructions: e.target.value })}
              placeholder="Enter step-by-step maintenance instructions..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-slate-700">
            {schedule && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isSaving || isDeleting}
                icon={<Trash2 size={16} />}
              >
                Delete
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving || isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSaving || isDeleting}
            >
              {isSaving
                ? 'Saving...'
                : schedule
                  ? 'Update Schedule'
                  : 'Create Schedule'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MaintenanceModal;
