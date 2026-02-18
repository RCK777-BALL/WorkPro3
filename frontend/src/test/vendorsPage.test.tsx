/*
 * SPDX-License-Identifier: MIT
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import VendorsPage from '@/pages/VendorsPage';

const routerFuture = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
} as const;

const mockUseVendors = vi.fn();
const mockMutateAsync = vi.fn();
const confirmSpy = vi.spyOn(window, 'confirm');

vi.mock('@/hooks/useVendors', () => ({
  useVendors: () => mockUseVendors(),
  useDeleteVendor: () => ({ mutateAsync: mockMutateAsync, isLoading: false }),
}));

describe('VendorsPage', () => {
const renderPage = () => render(
    <MemoryRouter future={routerFuture}>
      <VendorsPage />
    </MemoryRouter>,
  );

  beforeEach(() => {
    mockUseVendors.mockReset();
    mockMutateAsync.mockReset();
    confirmSpy.mockReturnValue(true);
  });

  it('loads and displays vendors', async () => {
    mockUseVendors.mockReturnValue({ data: [{ id: '1', name: 'Vendor A' }], isLoading: false, error: null });
    renderPage();
    expect(await screen.findByText('Vendor A')).toBeInTheDocument();
  });

  it('deletes vendor', async () => {
    mockUseVendors.mockReturnValue({ data: [{ id: '1', name: 'Vendor A' }], isLoading: false, error: null });
    renderPage();
    await screen.findByText('Vendor A');
    await userEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(mockMutateAsync).toHaveBeenCalledWith('1');
  });
});
