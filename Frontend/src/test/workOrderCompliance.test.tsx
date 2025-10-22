/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeEach, expect, vi } from 'vitest';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import React from 'react';
import WorkOrderForm from '@/components/work-orders/WorkOrderForm';
import type { WorkOrder } from '@/types';

const getMock = vi.fn();
const postMock = vi.fn();
const putMock = vi.fn();

vi.mock('@/lib/http', () => ({
  __esModule: true,
  default: {
    get: getMock,
    post: postMock,
    put: putMock,
  },
}));

const departmentStoreMock = {
  departments: [],
  linesByDepartment: {},
  stationsByLine: {},
  fetchDepartments: vi.fn().mockResolvedValue([]),
  fetchLines: vi.fn().mockResolvedValue([]),
  fetchStations: vi.fn().mockResolvedValue([]),
};

vi.mock('@/store/departmentStore', () => ({
  useDepartmentStore: (selector: (state: typeof departmentStoreMock) => unknown) =>
    selector(departmentStoreMock),
}));

const addToastMock = vi.fn();
vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ addToast: addToastMock }),
}));

describe('WorkOrderForm compliance fields', () => {
  beforeEach(() => {
    getMock.mockReset().mockResolvedValue({ data: [] });
    postMock.mockReset();
    putMock.mockReset();
    addToastMock.mockReset();
    departmentStoreMock.fetchDepartments.mockClear();
    departmentStoreMock.fetchLines.mockClear();
    departmentStoreMock.fetchStations.mockClear();
  });

  it('submits calibration metadata during create', async () => {
    const onSuccess = vi.fn();
    postMock.mockResolvedValue({
      data: {
        _id: 'wo-1',
        tenantId: 'tenant-1',
        title: 'Cal Order',
        type: 'calibration',
        complianceProcedureId: 'PROC-7',
        calibrationIntervalDays: 180,
      },
    });

    const { container } = render(<WorkOrderForm onSuccess={onSuccess} />);

    await waitFor(() => expect(getMock).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Cal Order' },
    });

    fireEvent.change(screen.getByLabelText('Type'), {
      target: { value: 'calibration' },
    });

    const procedureInput = screen.getByLabelText('Compliance Procedure ID');
    fireEvent.change(procedureInput, { target: { value: 'PROC-7' } });

    const intervalInput = screen.getByLabelText('Calibration Interval (days)');
    fireEvent.change(intervalInput, { target: { value: '180' } });

    const form = container.querySelector('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    await waitFor(() => expect(postMock).toHaveBeenCalled());

    expect(postMock.mock.calls[0][1]).toMatchObject({
      type: 'calibration',
      complianceProcedureId: 'PROC-7',
      calibrationIntervalDays: 180,
    });

    expect(onSuccess).toHaveBeenCalled();
    expect(onSuccess.mock.calls[0][0]).toMatchObject({
      type: 'calibration',
      complianceProcedureId: 'PROC-7',
      calibrationIntervalDays: 180,
    });
  });

  it('preserves safety procedure metadata during update', async () => {
    const workOrder: WorkOrder = {
      id: 'wo-safe',
      title: 'Safety Check',
      description: 'Ensure compliance',
      priority: 'high',
      status: 'assigned',
      type: 'safety',
      department: 'ops',
      complianceProcedureId: 'SAFE-9',
      assignees: [],
    } as WorkOrder;

    putMock.mockResolvedValue({
      data: {
        _id: 'wo-safe',
        tenantId: 'tenant-1',
        title: 'Safety Check',
        type: 'safety',
        complianceProcedureId: 'SAFE-9',
      },
    });

    const { container } = render(<WorkOrderForm workOrder={workOrder} />);

    await waitFor(() => expect(getMock).toHaveBeenCalled());

    const form = container.querySelector('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    await waitFor(() => expect(putMock).toHaveBeenCalled());

    expect(putMock.mock.calls[0][1]).toMatchObject({
      type: 'safety',
      complianceProcedureId: 'SAFE-9',
    });
  });
});
