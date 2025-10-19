/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

import Button from '@/components/common/Button';

export interface PreventiveMaintenanceFormValues {
  task: string;
  asset: string;
  frequency: string;
  nextDue: string;
  status: string;
}

interface PreventiveMaintenanceModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialValues?: PreventiveMaintenanceFormValues | null;
  onClose: () => void;
  onSubmit: (values: PreventiveMaintenanceFormValues) => void;
}

const DEFAULT_VALUES: PreventiveMaintenanceFormValues = {
  task: '',
  asset: '',
  frequency: 'Monthly',
  nextDue: new Date().toISOString().split('T')[0],
  status: 'Open',
};

const frequencyOptions = [
  'Daily',
  'Weekly',
  'Biweekly',
  'Monthly',
  'Quarterly',
  'Semiannually',
  'Annually',
];

const statusOptions = ['Open', 'In Progress', 'Pending Approval', 'Completed', 'Deferred'];

export default function PreventiveMaintenanceModal({
  isOpen,
  mode,
  initialValues,
  onClose,
  onSubmit,
}: PreventiveMaintenanceModalProps) {
  const [formValues, setFormValues] = useState<PreventiveMaintenanceFormValues>(DEFAULT_VALUES);

  useEffect(() => {
    if (isOpen) {
      setFormValues(initialValues ?? DEFAULT_VALUES);
    }
  }, [initialValues, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleChange = (
    field: keyof PreventiveMaintenanceFormValues,
    value: PreventiveMaintenanceFormValues[keyof PreventiveMaintenanceFormValues]
  ) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(formValues);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-700 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Preventive Maintenance</p>
            <h2 className="text-lg font-semibold">
              {mode === 'edit' ? 'Edit Maintenance Task' : 'Add Maintenance Task'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 px-6 py-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300" htmlFor="pm-task">
                Task name
              </label>
              <input
                id="pm-task"
                type="text"
                value={formValues.task}
                onChange={(event) => handleChange('task', event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/60"
                placeholder="Describe the maintenance task"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300" htmlFor="pm-asset">
                Asset
              </label>
              <input
                id="pm-asset"
                type="text"
                value={formValues.asset}
                onChange={(event) => handleChange('asset', event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/60"
                placeholder="Asset or location"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300" htmlFor="pm-frequency">
                  Frequency
                </label>
                <select
                  id="pm-frequency"
                  value={formValues.frequency}
                  onChange={(event) => handleChange('frequency', event.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/60"
                >
                  {frequencyOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300" htmlFor="pm-nextDue">
                  Next due date
                </label>
                <input
                  id="pm-nextDue"
                  type="date"
                  value={formValues.nextDue}
                  onChange={(event) => handleChange('nextDue', event.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/60"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300" htmlFor="pm-status">
                Status
              </label>
              <select
                id="pm-status"
                value={formValues.status}
                onChange={(event) => handleChange('status', event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/60"
              >
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col-reverse justify-between gap-3 border-t border-slate-800 pt-4 sm:flex-row sm:items-center">
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-center text-slate-300 hover:bg-slate-800 hover:text-white sm:w-auto"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="w-full justify-center sm:w-auto"
            >
              {mode === 'edit' ? 'Save changes' : 'Add task'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
