/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import Button from '@/components/ui/button';
import { useToast } from '@/context/ToastContext';
import { useDepartmentStore } from '@/store/departmentStore';

export type AssetFormValues = {
  name: string;
  location: string;
  department?: string;
  line?: string;
  station?: string;
  type: 'Electrical' | 'Mechanical' | 'Tooling' | 'Interface';
  status: 'Active' | 'Offline' | 'In Repair';
  criticality: 'high' | 'medium' | 'low';
  description?: string;
};

export interface AssetFormModalProps {
  open: boolean;
  loading?: boolean;
  initialValues?: AssetFormValues;
  onClose: () => void;
  onSubmit: (values: AssetFormValues) => Promise<void> | void;
}

const defaultValues: AssetFormValues = {
  name: '',
  location: '',
  department: '',
  line: '',
  station: '',
  type: 'Mechanical',
  status: 'Active',
  criticality: 'medium',
  description: '',
};

export default function AssetFormModal({
  open,
  loading = false,
  initialValues,
  onClose,
  onSubmit,
}: AssetFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AssetFormValues>({ defaultValues });
  const { addToast } = useToast();
  const departments = useDepartmentStore((state) => state.departments);
  const linesByDepartment = useDepartmentStore((state) => state.linesByDepartment);
  const stationsByLine = useDepartmentStore((state) => state.stationsByLine);
  const fetchDepartments = useDepartmentStore((state) => state.fetchDepartments);
  const fetchLines = useDepartmentStore((state) => state.fetchLines);
  const fetchStations = useDepartmentStore((state) => state.fetchStations);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [selectedLineId, setSelectedLineId] = useState('');
  const departmentName = watch('department');
  const lineName = watch('line');
  const stationName = watch('station');

  const lineOptions = useMemo(() => {
    if (!selectedDepartmentId) return [];
    return linesByDepartment[selectedDepartmentId] ?? [];
  }, [linesByDepartment, selectedDepartmentId]);

  const stationOptions = useMemo(() => {
    if (!selectedLineId) return [];
    return stationsByLine[selectedLineId] ?? [];
  }, [selectedLineId, stationsByLine]);

  useEffect(() => {
    if (!open) return;
    reset(initialValues ?? defaultValues);
  }, [initialValues, open, reset]);

  useEffect(() => {
    if (!open) return;
    fetchDepartments().catch(() => addToast('Failed to load departments', 'error'));
  }, [addToast, fetchDepartments, open]);

  useEffect(() => {
    if (!departmentName) {
      setSelectedDepartmentId('');
      return;
    }

    const department = departments.find((item) => item.name === departmentName);
    if (department) {
      setSelectedDepartmentId(department.id);
    } else {
      setSelectedDepartmentId('');
    }
  }, [departmentName, departments]);

  useEffect(() => {
    if (!selectedDepartmentId) {
      if (lineName) setValue('line', '');
      if (stationName) setValue('station', '');
      setSelectedLineId('');
      return;
    }

    fetchLines(selectedDepartmentId).catch(() =>
      addToast('Failed to load lines', 'error'),
    );
  }, [addToast, fetchLines, lineName, selectedDepartmentId, setValue, stationName]);

  useEffect(() => {
    if (!lineName || !selectedDepartmentId) {
      setSelectedLineId('');
      return;
    }

    const lines = linesByDepartment[selectedDepartmentId] ?? [];
    const line = lines.find((item) => item.name === lineName);
    if (line) {
      setSelectedLineId(line.id);
    } else {
      setSelectedLineId('');
    }
  }, [lineName, linesByDepartment, selectedDepartmentId]);

  useEffect(() => {
    if (!selectedLineId || !selectedDepartmentId) {
      if (stationName) setValue('station', '');
      return;
    }

    fetchStations(selectedDepartmentId, selectedLineId).catch(() =>
      addToast('Failed to load stations', 'error'),
    );
  }, [addToast, fetchStations, selectedDepartmentId, selectedLineId, setValue, stationName]);

  useEffect(() => {
    if (!stationName || !selectedLineId) return;

    const stations = stationsByLine[selectedLineId] ?? [];
    if (stationName && !stations.some((item) => item.name === stationName)) {
      setValue('station', '');
    }
  }, [selectedLineId, setValue, stationName, stationsByLine]);

  useEffect(() => {
    if (!lineName || !selectedDepartmentId) return;

    const lines = linesByDepartment[selectedDepartmentId] ?? [];
    if (lineName && !lines.some((item) => item.name === lineName)) {
      setValue('line', '');
    }
  }, [lineName, linesByDepartment, selectedDepartmentId, setValue]);

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initialValues ? 'Edit Asset' : 'Add Asset'}</DialogTitle>
          <DialogDescription>
            {initialValues
              ? 'Update the asset details below.'
              : 'Fill out the information below to create a new asset.'}
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-6"
          onSubmit={handleSubmit(async (values) => {
            await onSubmit(values);
          })}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-200" htmlFor="asset-name">
                Name
              </label>
              <input
                id="asset-name"
                className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Compressor A"
                disabled={loading}
                {...register('name', { required: 'Name is required' })}
              />
              {errors.name && (
                <p className="text-sm text-error-400">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-200" htmlFor="asset-location">
                Location
              </label>
              <input
                id="asset-location"
                className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Plant 1 - Utility Room"
                disabled={loading}
                {...register('location', { required: 'Location is required' })}
              />
              {errors.location && (
                <p className="text-sm text-error-400">{errors.location.message}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-200" htmlFor="asset-department">
                Department (optional)
              </label>
              <select
                id="asset-department"
                className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                disabled={loading || departments.length === 0}
                {...register('department')}
              >
                <option value="">Select department</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.name}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-200" htmlFor="asset-line">
                Line (optional)
              </label>
              <select
                id="asset-line"
                className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                disabled={
                  loading || !selectedDepartmentId || lineOptions.length === 0
                }
                {...register('line')}
              >
                <option value="">Select line</option>
                {lineOptions.map((line) => (
                  <option key={line.id} value={line.name}>
                    {line.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-200" htmlFor="asset-station">
                Station (optional)
              </label>
              <select
                id="asset-station"
                className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                disabled={
                  loading || !selectedLineId || stationOptions.length === 0
                }
                {...register('station')}
              >
                <option value="">Select station</option>
                {stationOptions.map((station) => (
                  <option key={station.id} value={station.name}>
                    {station.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-200" htmlFor="asset-type">
                Type
              </label>
              <select
                id="asset-type"
                className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                disabled={loading}
                {...register('type', { required: 'Type is required' })}
              >
                <option value="Electrical">Electrical</option>
                <option value="Mechanical">Mechanical</option>
                <option value="Tooling">Tooling</option>
                <option value="Interface">Interface</option>
              </select>
              {errors.type && (
                <p className="text-sm text-error-400">{errors.type.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-200" htmlFor="asset-status">
                Status
              </label>
              <select
                id="asset-status"
                className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                disabled={loading}
                {...register('status', { required: 'Status is required' })}
              >
                <option value="Active">Active</option>
                <option value="Offline">Offline</option>
                <option value="In Repair">In Repair</option>
              </select>
              {errors.status && (
                <p className="text-sm text-error-400">{errors.status.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-200" htmlFor="asset-criticality">
              Criticality
            </label>
            <select
              id="asset-criticality"
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={loading}
              {...register('criticality', { required: 'Criticality is required' })}
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            {errors.criticality && (
              <p className="text-sm text-error-400">{errors.criticality.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-200" htmlFor="asset-description">
              Description (optional)
            </label>
            <textarea
              id="asset-description"
              className="min-h-[120px] w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Add context for the asset..."
              disabled={loading}
              {...register('description')}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : initialValues ? 'Save changes' : 'Create asset'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
