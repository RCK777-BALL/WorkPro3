/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import type { DowntimeAssetOption, DowntimeLog, DowntimeWorkOrderOption } from '@/api/downtime';

const parseDateTimeLocal = (value: string): Date => new Date(value);

const normalizeEndDate = (startValue: string, endValue: string): string => {
  const start = parseDateTimeLocal(startValue);
  const end = parseDateTimeLocal(endValue);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return endValue;
  }

  if (end > start) {
    return endValue;
  }

  // When users pick an end clock time after midnight on the same calendar date
  // (e.g. start 11:30 PM, end 12:00 AM), treat end as next day.
  const nextDay = new Date(end);
  nextDay.setDate(nextDay.getDate() + 1);
  return nextDay.toISOString().slice(0, 16);
};

const schema = z
  .object({
    assetId: z.string().min(1, 'Asset is required'),
    workOrderId: z.string().optional(),
    start: z.string().min(1, 'Start time is required'),
    end: z.string().min(1, 'End time is required'),
    cause: z.string().min(1, 'Cause is required'),
    impact: z.string().min(1, 'Impact is required'),
  })
  .refine((value) => new Date(value.start) < new Date(value.end), {
    message: 'End time must be after start time',
    path: ['end'],
  });

export type DowntimeFormValues = z.infer<typeof schema>;

type Props = {
  assets: DowntimeAssetOption[];
  workOrders: DowntimeWorkOrderOption[];
  onSubmit: (values: DowntimeFormValues) => Promise<void>;
  onCancelEdit?: () => void;
  defaultValues?: DowntimeLog | null;
  isSaving?: boolean;
  overlapError?: string | null;
};

const DowntimeForm = ({
  assets,
  workOrders,
  onSubmit,
  onCancelEdit,
  defaultValues,
  isSaving,
  overlapError,
}: Props) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<DowntimeFormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues
      ? {
          assetId: defaultValues.assetId,
          workOrderId: defaultValues.workOrderId ?? '',
          start: defaultValues.start.slice(0, 16),
          end: defaultValues.end?.slice(0, 16) ?? defaultValues.start.slice(0, 16),
          cause: defaultValues.cause ?? '',
          impact: defaultValues.impact ?? '',
        }
      : {
          assetId: '',
          workOrderId: '',
          start: '',
          end: '',
          cause: '',
          impact: '',
        },
  });

  useEffect(() => {
    if (defaultValues) {
      reset({
        assetId: defaultValues.assetId,
        workOrderId: defaultValues.workOrderId ?? '',
        start: defaultValues.start.slice(0, 16),
        end: defaultValues.end?.slice(0, 16) ?? defaultValues.start.slice(0, 16),
        cause: defaultValues.cause ?? '',
        impact: defaultValues.impact ?? '',
      });
    } else {
      reset({ assetId: '', workOrderId: '', start: '', end: '', cause: '', impact: '' });
    }
  }, [defaultValues, reset]);

  return (
    <form
      className="rounded-lg bg-neutral-900 p-4 shadow-sm ring-1 ring-neutral-800"
      onSubmit={handleSubmit(async (values) => {
        const normalizedValues: DowntimeFormValues = {
          ...values,
          end: normalizeEndDate(values.start, values.end),
        };
        try {
          await onSubmit(normalizedValues);
        } catch {
          // Parent mutation handlers surface toast errors; swallow here to avoid uncaught promise noise.
        }
      })}
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">
            {defaultValues ? 'Update downtime entry' : 'Record downtime'}
          </h2>
          <p className="text-sm text-neutral-400">
            Capture affected asset, work order context, time window, and impact.
          </p>
        </div>
        {defaultValues && (
          <button
            type="button"
            className="text-sm text-blue-300 hover:text-blue-200"
            onClick={onCancelEdit}
          >
            Cancel edit
          </button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm text-neutral-300">
          Asset
          <select
            className="mt-1 w-full rounded border border-neutral-700 bg-neutral-800 p-2 text-neutral-100"
            {...register('assetId')}
            data-testid="asset-select"
          >
            <option value="">Select an asset</option>
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.name}
              </option>
            ))}
          </select>
          {errors.assetId && <p className="text-xs text-red-400">{errors.assetId.message}</p>}
        </label>

        <label className="text-sm text-neutral-300">
          Work order (optional)
          <select
            className="mt-1 w-full rounded border border-neutral-700 bg-neutral-800 p-2 text-neutral-100"
            {...register('workOrderId')}
            data-testid="workorder-select"
          >
            <option value="">No linked work order</option>
            {workOrders.map((order) => (
              <option key={order.id} value={order.id}>
                {order.title}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-neutral-300">
          Start time
          <input
            type="datetime-local"
            className="mt-1 w-full rounded border border-neutral-700 bg-neutral-800 p-2 text-neutral-100"
            {...register('start')}
          />
          {errors.start && <p className="text-xs text-red-400">{errors.start.message}</p>}
        </label>

        <label className="text-sm text-neutral-300">
          End time
          <input
            type="datetime-local"
            className="mt-1 w-full rounded border border-neutral-700 bg-neutral-800 p-2 text-neutral-100"
            {...register('end')}
          />
          {errors.end && <p className="text-xs text-red-400">{errors.end.message}</p>}
        </label>

        <label className="text-sm text-neutral-300">
          Cause
          <input
            type="text"
            placeholder="e.g. Unplanned outage, planned changeover"
            className="mt-1 w-full rounded border border-neutral-700 bg-neutral-800 p-2 text-neutral-100"
            {...register('cause')}
          />
          {errors.cause && <p className="text-xs text-red-400">{errors.cause.message}</p>}
        </label>

        <label className="text-sm text-neutral-300">
          Impact
          <input
            type="text"
            placeholder="e.g. Production loss, safety, quality"
            className="mt-1 w-full rounded border border-neutral-700 bg-neutral-800 p-2 text-neutral-100"
            {...register('impact')}
          />
          {errors.impact && <p className="text-xs text-red-400">{errors.impact.message}</p>}
        </label>
      </div>

      {overlapError && <p className="mt-2 text-sm text-amber-400">{overlapError}</p>}

      <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-end">
        <button
          type="submit"
          className="w-full rounded bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 md:w-auto"
          disabled={isSaving}
        >
          {defaultValues ? 'Update entry' : 'Save downtime'}
        </button>
      </div>
    </form>
  );
};

export default DowntimeForm;
