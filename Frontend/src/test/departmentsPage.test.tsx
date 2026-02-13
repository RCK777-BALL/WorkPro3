/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Departments from '@/pages/Departments';

const mockListDepartmentHierarchy = vi.fn();

vi.mock('file-saver', () => ({ saveAs: vi.fn() }));

vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

vi.mock('@/components/departments/DepartmentTable', () => ({
  default: ({ departments }: { departments: Array<unknown> }) => (
    <div>DepartmentTable {departments.length}</div>
  ),
}));

vi.mock('@/components/departments/DepartmentModal', () => ({
  default: () => null,
}));

vi.mock('@/components/departments/LineModal', () => ({
  default: () => null,
}));

vi.mock('@/components/departments/StationModal', () => ({
  default: () => null,
}));

vi.mock('@/components/departments/AssetModal', () => ({
  default: () => null,
}));

vi.mock('@/components/common/ConfirmDialog', () => ({
  default: () => null,
}));

vi.mock('@/components/common/LoadingSpinner', () => ({
  default: () => <div>LoadingSpinner</div>,
}));

vi.mock('@/api/departments', () => ({
  createAsset: vi.fn(),
  createDepartment: vi.fn(),
  createLine: vi.fn(),
  createStation: vi.fn(),
  deleteAsset: vi.fn(),
  deleteDepartment: vi.fn(),
  deleteLine: vi.fn(),
  deleteStation: vi.fn(),
  listDepartmentHierarchy: () => mockListDepartmentHierarchy(),
  mapDepartmentResponse: vi.fn((value: unknown) => value),
  exportDepartmentsExcel: vi.fn(),
  importDepartmentsExcel: vi.fn(),
  updateDepartment: vi.fn(),
  updateAsset: vi.fn(),
  updateLine: vi.fn(),
  updateStation: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

describe('Departments page', () => {
  beforeEach(() => {
    mockListDepartmentHierarchy.mockResolvedValue([
      {
        id: 'dept-1',
        name: 'Assembly',
        plant: { id: 'plant-1', name: 'Plant 1' },
        lines: [
          {
            id: 'line-1',
            name: 'Line A',
            department: 'dept-1',
            stations: [
              {
                id: 'station-1',
                name: 'Station 1',
                line: 'line-1',
                assets: [
                  { id: 'asset-1', name: 'Pump', type: 'Mechanical', tenantId: 'tenant-1' },
                ],
              },
            ],
          },
        ],
      },
    ]);
  });

  it('loads department hierarchy and renders the table', async () => {
    render(<Departments />);

    expect(await screen.findByText('Departments')).toBeTruthy();
    await waitFor(() => expect(mockListDepartmentHierarchy).toHaveBeenCalled());
    expect(screen.getByText('DepartmentTable 1')).toBeTruthy();
  });
});
