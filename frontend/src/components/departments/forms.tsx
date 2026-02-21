/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect } from 'react';
import { useForm, type SubmitHandler } from 'node_modules/react-hook-form/dist';
import Button from '@/components/common/Button';

export interface DepartmentPayload {
  name: string;
  description?: string;
}

interface DepartmentFormProps {
  initial?: DepartmentPayload;
  onSubmit: (payload: DepartmentPayload) => Promise<void> | void;
  onCancel: () => void;
}

export function DepartmentForm({ initial, onSubmit, onCancel }: DepartmentFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DepartmentPayload>({
    defaultValues: initial ?? { name: '', description: '' },
  });

  useEffect(() => {
    reset(initial ?? { name: '', description: '' });
  }, [initial, reset]);

  const onValid: SubmitHandler<DepartmentPayload> = async (data) => {
    await onSubmit({ name: data.name.trim(), description: data.description?.trim() || undefined });
  };

  return (
    <form onSubmit={handleSubmit(onValid)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Name<span className="text-red-500">*</span></label>
        <input
          className="w-full px-3 py-2 border border-[var(--wp-color-border)] rounded-md"
          {...register('name', { required: 'Name is required' })}
        />
        {errors.name && (
          <p className="text-error-500 text-sm mt-1">{errors.name.message}</p>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea
          className="w-full px-3 py-2 border border-[var(--wp-color-border)] rounded-md"
          {...register('description')}
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={isSubmitting}>
          Save
        </Button>
      </div>
    </form>
  );
}

export interface LinePayload {
  name: string;
}

interface LineFormProps {
  initial?: LinePayload;
  onSubmit: (payload: LinePayload) => Promise<void> | void;
  onCancel: () => void;
}

export function LineForm({ initial, onSubmit, onCancel }: LineFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LinePayload>({
    defaultValues: initial ?? { name: '' },
  });

  useEffect(() => {
    reset(initial ?? { name: '' });
  }, [initial, reset]);

  const onValid: SubmitHandler<LinePayload> = async (data) => {
    await onSubmit({ name: data.name.trim() });
  };

  return (
    <form onSubmit={handleSubmit(onValid)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Name<span className="text-red-500">*</span></label>
        <input
          className="w-full px-3 py-2 border border-[var(--wp-color-border)] rounded-md"
          {...register('name', { required: 'Name is required' })}
        />
        {errors.name && (
          <p className="text-error-500 text-sm mt-1">{errors.name.message}</p>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={isSubmitting}>
          Save
        </Button>
      </div>
    </form>
  );
}

export interface StationPayload {
  name: string;
}

interface StationFormProps {
  initial?: StationPayload;
  onSubmit: (payload: StationPayload) => Promise<void> | void;
  onCancel: () => void;
}

export function StationForm({ initial, onSubmit, onCancel }: StationFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StationPayload>({
    defaultValues: initial ?? { name: '' },
  });

  useEffect(() => {
    reset(initial ?? { name: '' });
  }, [initial, reset]);

  const onValid: SubmitHandler<StationPayload> = async (data) => {
    await onSubmit({ name: data.name.trim() });
  };

  return (
    <form onSubmit={handleSubmit(onValid)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Name<span className="text-red-500">*</span></label>
        <input
          className="w-full px-3 py-2 border border-[var(--wp-color-border)] rounded-md"
          {...register('name', { required: 'Name is required' })}
        />
        {errors.name && (
          <p className="text-error-500 text-sm mt-1">{errors.name.message}</p>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={isSubmitting}>
          Save
        </Button>
      </div>
    </form>
  );
}

export default DepartmentForm;

