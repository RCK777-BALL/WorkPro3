/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect } from 'react';
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
    formState: { errors },
  } = useForm<AssetFormValues>({ defaultValues });

  useEffect(() => {
    if (!open) return;
    reset(initialValues ?? defaultValues);
  }, [initialValues, open, reset]);

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
              <input
                id="asset-department"
                className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Assembly"
                disabled={loading}
                {...register('department')}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-200" htmlFor="asset-line">
                Line (optional)
              </label>
              <input
                id="asset-line"
                className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Line 1"
                disabled={loading}
                {...register('line')}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-200" htmlFor="asset-station">
                Station (optional)
              </label>
              <input
                id="asset-station"
                className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Station A"
                disabled={loading}
                {...register('station')}
              />
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
