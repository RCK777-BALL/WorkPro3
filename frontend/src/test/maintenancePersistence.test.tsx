/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Maintenance from '@/pages/Maintenance';
import type { MaintenanceSchedule } from '@/types';
import toast from 'react-hot-toast';

vi.mock('react-hot-toast', () => {
  const toastMock = Object.assign(() => undefined, {
    success: vi.fn(),
    error: vi.fn(),
  });
  return { __esModule: true, default: toastMock };
});

vi.mock('uuid', () => ({ v4: () => 'temp-id' }));

const fetchMaintenanceSchedules = vi.fn<[], Promise<MaintenanceSchedule[]>>();
const createMaintenanceSchedule = vi.fn<[
  MaintenanceSchedule
], Promise<MaintenanceSchedule>>();
const updateMaintenanceSchedule = vi.fn<[
  string,
  MaintenanceSchedule
], Promise<MaintenanceSchedule>>();
const deleteMaintenanceSchedule = vi.fn<[
  string
], Promise<void>>();

vi.mock('@/api/maintenanceSchedules', () => ({
  fetchMaintenanceSchedules,
  createMaintenanceSchedule,
  updateMaintenanceSchedule,
  deleteMaintenanceSchedule,
}));

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

const createDeferred = <T,>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('Maintenance persistence flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads schedules from the API on mount', async () => {
    fetchMaintenanceSchedules.mockResolvedValue([
      {
        id: 'schedule-1',
        title: 'Monthly Belt Inspection',
        description: 'Inspect belts',
        assetId: 'A-1',
        frequency: 'monthly',
        nextDue: '2024-03-15',
        estimatedDuration: 2,
        instructions: 'Check belt tension',
        type: 'preventive',
        repeatConfig: { interval: 1, unit: 'month' },
        parts: [],
        lastCompleted: '2024-02-15',
        assignedTo: 'Mike',
      },
    ]);

    render(<Maintenance />);

    await waitFor(() => expect(fetchMaintenanceSchedules).toHaveBeenCalled());

    expect(await screen.findByText('Monthly Belt Inspection')).toBeInTheDocument();
  });

  it('optimistically creates a schedule and replaces it with the saved result', async () => {
    fetchMaintenanceSchedules.mockResolvedValue([]);
    const deferred = createDeferred<MaintenanceSchedule>();
    createMaintenanceSchedule.mockReturnValue(deferred.promise);

    render(<Maintenance />);

    const newButton = await screen.findByRole('button', { name: /new schedule/i });
    await userEvent.click(newButton);

    const inputs = screen.getAllByRole('textbox');
    await userEvent.clear(inputs[0]);
    await userEvent.type(inputs[0], 'Hydraulic Check');
    await userEvent.clear(inputs[1]);
    await userEvent.type(inputs[1], 'HX-42');

    const saveButton = screen.getByRole('button', { name: /create schedule/i });
    await userEvent.click(saveButton);

    expect(createMaintenanceSchedule).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Hydraulic Check' }),
    );

    const table = await screen.findByRole('table');
    await waitFor(() => {
      expect(within(table).getByText('Hydraulic Check')).toBeInTheDocument();
    });

    deferred.resolve({
      id: 'srv-1',
      title: 'Hydraulic Check',
      description: '',
      assetId: 'HX-42',
      frequency: 'monthly',
      nextDue: new Date().toISOString().split('T')[0],
      estimatedDuration: 1,
      instructions: '',
      type: 'preventive',
      repeatConfig: { interval: 1, unit: 'month' },
      parts: [],
    });

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Maintenance schedule created'));

    await waitFor(() => {
      expect(screen.queryByText('Create Maintenance Schedule')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(within(table).getByText('srv-1')).toBeInTheDocument();
    });
  });

  it('rolls back optimistic create on failure and keeps the modal open', async () => {
    fetchMaintenanceSchedules.mockResolvedValue([]);
    createMaintenanceSchedule.mockRejectedValue(new Error('Network error'));

    render(<Maintenance />);

    const newButton = await screen.findByRole('button', { name: /new schedule/i });
    await userEvent.click(newButton);

    const inputs = screen.getAllByRole('textbox');
    await userEvent.clear(inputs[0]);
    await userEvent.type(inputs[0], 'Hydraulic Check');
    await userEvent.clear(inputs[1]);
    await userEvent.type(inputs[1], 'HX-42');

    const saveButton = screen.getByRole('button', { name: /create schedule/i });
    await userEvent.click(saveButton);

    await waitFor(() => expect(createMaintenanceSchedule).toHaveBeenCalled());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Network error'));

    const table = await screen.findByRole('table');
    await waitFor(() => {
      expect(within(table).queryByText('Hydraulic Check')).toBeNull();
    });

    expect(screen.getByText('Create Maintenance Schedule')).toBeInTheDocument();
  });
});
