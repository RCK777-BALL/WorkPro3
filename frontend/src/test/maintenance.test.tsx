/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Maintenance from '@/pages/Maintenance';
import MaintenanceModal from '@/components/maintenance/MaintenanceModal';
import type { MaintenanceSchedule } from '@/types';
import {
  getMaintenanceSchedules,
  createMaintenanceSchedule,
  updateMaintenanceSchedule,
  deleteMaintenanceSchedule,
} from '@/api/maintenanceSchedules';
import { vi } from 'vitest';

vi.mock('uuid', () => ({ v4: vi.fn(() => 'temp-id') }));

const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: toastSuccess,
    error: toastError,
  },
  success: toastSuccess,
  error: toastError,
}));

vi.mock('@/api/maintenanceSchedules', () => ({
  getMaintenanceSchedules: vi.fn(),
  createMaintenanceSchedule: vi.fn(),
  updateMaintenanceSchedule: vi.fn(),
  deleteMaintenanceSchedule: vi.fn(),
}));

const mockedGetMaintenanceSchedules = vi.mocked(getMaintenanceSchedules);
const mockedCreateMaintenanceSchedule = vi.mocked(createMaintenanceSchedule);
const mockedUpdateMaintenanceSchedule = vi.mocked(updateMaintenanceSchedule);
const mockedDeleteMaintenanceSchedule = vi.mocked(deleteMaintenanceSchedule);

const baseSchedule: MaintenanceSchedule = {
  id: 'sched-1',
  title: 'Monthly Belt Inspection',
  description: 'Inspect belt tension, wear, and alignment. Lubricate bearings.',
  assetId: 'CVB-A1',
  frequency: 'monthly',
  lastCompleted: '2024-02-15',
  nextDue: '2024-03-15',
  assignedTo: 'Mike Johnson',
  instructions: '1. Check belt tension\n2. Inspect for wear\n3. Verify alignment\n4. Lubricate bearings',
  type: 'preventive',
  estimatedDuration: 2,
  repeatConfig: { interval: 1, unit: 'month' },
  parts: [],
};

const renderModal = (props?: Partial<React.ComponentProps<typeof MaintenanceModal>>) => {
  return render(
    <MaintenanceModal
      isOpen
      onClose={vi.fn()}
      schedule={null}
      onOptimisticSave={() => vi.fn()}
      onFinalizeSave={vi.fn()}
      onOptimisticDelete={() => vi.fn()}
      {...props}
    />,
  );
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Maintenance page', () => {
  it('loads schedules from the API and displays them', async () => {
    mockedGetMaintenanceSchedules.mockResolvedValueOnce([baseSchedule]);

    render(<Maintenance />);

    expect(mockedGetMaintenanceSchedules).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(baseSchedule.title)).toBeInTheDocument();
  });
});

describe('MaintenanceModal', () => {
  it('creates a schedule through the API and closes on success', async () => {
    mockedCreateMaintenanceSchedule.mockResolvedValueOnce({
      ...baseSchedule,
      id: 'persisted-id',
    });
    const onOptimisticSave = vi.fn<
      (value: MaintenanceSchedule) => () => void
    >(() => vi.fn());
    const onFinalizeSave = vi.fn();
    const onClose = vi.fn();

    renderModal({
      onOptimisticSave,
      onFinalizeSave,
      onClose,
    });

    await userEvent.type(screen.getByLabelText(/title/i), 'New schedule');
    await userEvent.click(screen.getByRole('button', { name: /create schedule/i }));

    await waitFor(() => {
      expect(mockedCreateMaintenanceSchedule).toHaveBeenCalledTimes(1);
    });

    const optimisticCall = onOptimisticSave.mock.calls[0]?.[0];
    expect(optimisticCall?.id).toBe('temp-id');

    await waitFor(() => {
      expect(onFinalizeSave).toHaveBeenCalledWith('temp-id', {
        ...baseSchedule,
        id: 'persisted-id',
      });
    });

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });

    expect(toastSuccess).toHaveBeenCalled();
    expect(toastError).not.toHaveBeenCalled();
  });

  it('rolls back changes when update fails', async () => {
    mockedUpdateMaintenanceSchedule.mockRejectedValueOnce(new Error('network error'));
    const rollback = vi.fn();
    const onOptimisticSave = vi.fn<
      (value: MaintenanceSchedule) => () => void
    >(() => rollback);
    const onFinalizeSave = vi.fn();
    const onClose = vi.fn();

    renderModal({
      schedule: baseSchedule,
      onOptimisticSave,
      onFinalizeSave,
      onClose,
    });

    await userEvent.type(screen.getByLabelText(/title/i), ' updated');
    await userEvent.click(screen.getByRole('button', { name: /update schedule/i }));

    await waitFor(() => {
      expect(mockedUpdateMaintenanceSchedule).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(rollback).toHaveBeenCalled();
    });

    expect(onFinalizeSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalled();
  });

  it('deletes a schedule and closes on success', async () => {
    mockedDeleteMaintenanceSchedule.mockResolvedValueOnce(undefined);
    const onOptimisticDelete = vi.fn<(id: string) => () => void>(() => vi.fn());
    const onClose = vi.fn();
    const confirmSpy = vi
      .spyOn(window, 'confirm')
      .mockImplementation(() => true);

    renderModal({
      schedule: baseSchedule,
      onOptimisticDelete,
      onClose,
    });

    await userEvent.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(mockedDeleteMaintenanceSchedule).toHaveBeenCalledWith(baseSchedule.id);
    });

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });

    expect(onOptimisticDelete).toHaveBeenCalledWith(baseSchedule.id);
    expect(toastSuccess).toHaveBeenCalled();

    confirmSpy.mockRestore();
  });
});
