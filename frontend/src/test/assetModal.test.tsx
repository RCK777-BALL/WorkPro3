/*
 * SPDX-License-Identifier: MIT
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import AssetModal from '@/components/assets/AssetModal';
import type { Asset } from '@/types';

const {
  httpMock,
  mockAddToast,
  mockFetchDepartments,
  mockFetchLines,
  mockFetchStations,
} = vi.hoisted(() => ({
  httpMock: { post: vi.fn(), put: vi.fn() },
  mockAddToast: vi.fn(),
  mockFetchDepartments: vi.fn(),
  mockFetchLines: vi.fn(),
  mockFetchStations: vi.fn(),
}));

const { post: mockPost, put: mockPut } = httpMock;

vi.mock('@/lib/http', () => ({
  default: httpMock,
}));

vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

vi.mock('@/store/departmentStore', () => ({
  useDepartmentStore: (selector: (state: any) => any) =>
    selector({
      departments: [],
      linesByDepartment: {},
      stationsByLine: {},
      fetchDepartments: mockFetchDepartments,
      fetchLines: mockFetchLines,
      fetchStations: mockFetchStations,
    }),
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (state: any) => any) => selector({ user: { tenantId: 'tenant-123' } }),
}));

vi.mock('@/context/ScopeContext', () => ({
  useScopeContext: () => ({ activePlant: { id: 'site-1' } }),
}));

vi.mock('@/components/qr/AssetQRCode', () => ({
  default: () => <div data-testid="asset-qr" />,
}));

vi.mock('react-dropzone', () => ({
  useDropzone: () => ({
    getRootProps: () => ({}),
    getInputProps: () => ({}),
  }),
}));

describe('AssetModal form submission', () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockPut.mockReset();
    mockAddToast.mockReset();
    mockFetchDepartments.mockReset();
    mockFetchLines.mockReset();
    mockFetchStations.mockReset();
    mockFetchDepartments.mockResolvedValue([]);
    mockFetchLines.mockResolvedValue([]);
    mockFetchStations.mockResolvedValue([]);
  });

  it('creates a new asset with POST /assets', async () => {
    mockPost.mockResolvedValue({ data: { _id: 'asset-1', name: 'Created Asset' } });
    const onUpdate = vi.fn();

    render(
      <AssetModal isOpen={true} onClose={() => {}} asset={null} onUpdate={onUpdate} />,
    );

    const nameInput = screen.getAllByRole('textbox')[0];
    await userEvent.type(nameInput, 'Created Asset');
    await userEvent.click(screen.getByRole('button', { name: /create asset/i }));

    await waitFor(() => expect(mockPost).toHaveBeenCalled());
    expect(mockPut).not.toHaveBeenCalled();
    expect(mockPost.mock.calls[0]?.[0]).toBe('/assets');
    expect(mockPost.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ name: 'Created Asset', tenantId: 'tenant-123' }),
    );
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'asset-1', name: 'Created Asset' }) as Asset,
    );
  });

  it('updates an existing asset with PUT /assets/:id', async () => {
    mockPut.mockResolvedValue({ data: { _id: 'asset-2', name: 'Updated Asset' } });
      const onUpdate = vi.fn();
      const existing: Asset = {
        id: 'asset-2',
        tenantId: 'tenant-1',
        name: 'Existing Asset',
        type: 'Electrical',
        status: 'Active',
        criticality: 'medium',
      };

    render(
      <AssetModal isOpen={true} onClose={() => {}} asset={existing} onUpdate={onUpdate} />,
    );

    const nameInput = screen.getAllByRole('textbox')[0];
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Updated Asset');
    await userEvent.click(screen.getByRole('button', { name: /update asset/i }));

    await waitFor(() => expect(mockPut).toHaveBeenCalled());
    expect(mockPost).not.toHaveBeenCalled();
    expect(mockPut.mock.calls[0]?.[0]).toBe('/assets/asset-2');
    expect(mockPut.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ name: 'Updated Asset', tenantId: 'tenant-123' }),
    );
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'asset-2', name: 'Updated Asset' }) as Asset,
    );
  });
});
