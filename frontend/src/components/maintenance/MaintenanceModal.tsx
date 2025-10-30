/*
 * SPDX-License-Identifier: MIT
 */

import React, { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@common/Button';
import type { MaintenanceSchedule } from '@/types';
import { v4 as uuidv4 } from 'uuid';

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
  onSubmit: (schedule: MaintenanceSchedule) => Promise<void>;
  onDelete?: (schedule: MaintenanceSchedule) => Promise<void>;
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
  onSubmit,
  onDelete,
}) => {
  const [formData, setFormData] = useState<MaintenanceSchedule>(
    schedule ?? createDefaultSchedule()
  );

  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
    setIsSaving(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to save maintenance schedule'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!schedule || !onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(schedule);
      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to delete maintenance schedule'));
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
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
            {schedule ? 'Edit Maintenance Schedule' : 'Create Maintenance Schedule'}
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            disabled={isSaving || isDeleting}
            aria-disabled={isSaving || isDeleting}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-1">
                Title
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                value={formData.title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-1">
                Asset ID
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                value={formData.assetId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, assetId: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-1">
              Description
            </label>
            <textarea
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
              rows={4}
              value={formData.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-1">
                Type
              </label>
              <select
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
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
              <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-1">
                Frequency
              </label>
              <select
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
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
              <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-1">
                Start Date
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                value={formData.nextDue}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, nextDue: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-1">
                Estimated Duration (hours)
              </label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
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
              <div className="space-y-4 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-1">
                      Repeat Every
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="number"
                        className="w-20 px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
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
                        className="flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
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
                    <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-1">
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
                        <span className="text-sm text-neutral-900 dark:text-white">Never</span>
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
                        <span className="text-sm text-neutral-900 dark:text-white">On</span>
                        <input
                          type="date"
                          className="flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
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
                        <span className="text-sm text-neutral-900 dark:text-white">After</span>
                        <input
                          type="number"
                          className="w-20 px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
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
                        <span className="text-sm text-neutral-900 dark:text-white">occurrences</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center space-x-2 text-warning-600 dark:text-warning-400">
                    <AlertTriangle size={16} />
                    <span className="text-sm">
                      Changes to the schedule will affect all future occurrences
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-1">
              Instructions
            </label>
            <textarea
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
              rows={6}
              value={formData.instructions}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, instructions: e.target.value })}
              placeholder="Enter step-by-step maintenance instructions..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-neutral-200 dark:border-neutral-700">
            {schedule && onDelete && (
              <Button
                type="button"
                variant="danger"
                onClick={handleDelete}
                disabled={isSaving}
                loading={isDeleting}
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
              loading={isSaving}
              disabled={isDeleting}
            >
              {schedule ? 'Update Schedule' : 'Create Schedule'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MaintenanceModal;
