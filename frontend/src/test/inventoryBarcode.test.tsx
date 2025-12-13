/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/http', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

vi.mock('@/auth/usePermissions', () => ({
  usePermissions: () => ({ can: () => true }),
}));

var inventoryHooks: {
  useLocationsQuery: ReturnType<typeof vi.fn>;
  useStockItemsQuery: ReturnType<typeof vi.fn>;
  useStockHistoryQuery: ReturnType<typeof vi.fn>;
  useTransferInventory: ReturnType<typeof vi.fn>;
  INVENTORY_LOCATIONS_QUERY_KEY: readonly string[];
  INVENTORY_STOCK_QUERY_KEY: readonly string[];
  INVENTORY_HISTORY_QUERY_KEY: readonly string[];
};

vi.mock('@/features/inventory', () => {
  inventoryHooks = {
    useLocationsQuery: vi.fn(),
    useStockItemsQuery: vi.fn(),
    useStockHistoryQuery: vi.fn(),
    useTransferInventory: vi.fn(() => ({ mutateAsync: vi.fn(), isLoading: false, isError: false, error: null })),
    INVENTORY_LOCATIONS_QUERY_KEY: ['inventory', 'v2', 'locations'] as const,
    INVENTORY_STOCK_QUERY_KEY: ['inventory', 'v2', 'stock'] as const,
    INVENTORY_HISTORY_QUERY_KEY: ['inventory', 'v2', 'history'] as const,
  };
  return inventoryHooks;
});

vi.mock('@/api/inventory', () => ({
  fetchParts: vi.fn(),
  upsertPart: vi.fn(),
  upsertLocation: vi.fn(),
}));

import InventoryLocations from '@/pages/InventoryLocations';
import InventoryParts from '@/pages/InventoryParts';
import { fetchParts, upsertLocation, upsertPart } from '@/api/inventory';

const renderWithClient = (ui: React.ReactElement) => {
  const client = new QueryClient();
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};

describe('Inventory barcode flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (inventoryHooks.useLocationsQuery as any).mockReturnValue({ data: [], isLoading: false, error: null });
    (inventoryHooks.useStockItemsQuery as any).mockReturnValue({ data: [], isLoading: false, error: null });
    (inventoryHooks.useStockHistoryQuery as any).mockReturnValue({ data: [], isLoading: false, error: null });
    (inventoryHooks.useTransferInventory as any).mockReturnValue({ mutateAsync: vi.fn(), isLoading: false, isError: false, error: null });
  });

  it('validates part barcode input before submit', async () => {
    (fetchParts as any).mockResolvedValue({ items: [], page: 1, total: 0, pageSize: 25, totalPages: 1 });
    render(<InventoryParts />);

    await waitFor(() => expect(fetchParts).toHaveBeenCalled());

    await userEvent.type(screen.getByLabelText(/name/i), 'Valve');
    await userEvent.type(screen.getByLabelText(/barcode/i), ' spaced ');
    await userEvent.click(screen.getByRole('button', { name: /save part/i }));

    expect(await screen.findByText(/cannot include spaces/i)).toBeInTheDocument();
    expect(upsertPart).not.toHaveBeenCalled();
  });

  it('surfaces server errors for duplicate part barcodes', async () => {
    (fetchParts as any).mockResolvedValue({ items: [], page: 1, total: 0, pageSize: 25, totalPages: 1 });
    (upsertPart as any).mockRejectedValue({ response: { data: { message: 'Barcode must be unique per tenant' } } });

    render(<InventoryParts />);
    await waitFor(() => expect(fetchParts).toHaveBeenCalled());

    await userEvent.type(screen.getByLabelText(/name/i), 'Widget');
    await userEvent.type(screen.getByLabelText(/barcode/i), 'ABC-123');
    await userEvent.click(screen.getByRole('button', { name: /save part/i }));

    expect(await screen.findByText(/barcode must be unique/i)).toBeInTheDocument();
    expect(upsertPart).toHaveBeenCalledWith(expect.objectContaining({ barcode: 'ABC-123', name: 'Widget' }));
  });

  it('renders and validates location barcode values', async () => {
    const locations = [
      { id: 'loc-1', tenantId: 't1', store: 'Main', room: 'A', bin: '1', barcode: 'LOC-001' },
    ];
    (inventoryHooks.useLocationsQuery as any).mockReturnValue({ data: locations, isLoading: false, error: null });
    (upsertLocation as any).mockRejectedValue({ response: { data: { message: 'Location barcode must be unique per tenant' } } });

    renderWithClient(<InventoryLocations />);

    await userEvent.click(screen.getByRole('button', { name: /main.*a.*1/i }));
    expect(await screen.findByDisplayValue('LOC-001')).toBeInTheDocument();

    const barcodeInput = screen.getByLabelText(/barcode/i);
    await userEvent.clear(barcodeInput);
    await userEvent.type(barcodeInput, ' another code ');
    await userEvent.click(screen.getByRole('button', { name: /update location/i }));

    expect(await screen.findByText(/cannot include spaces/i)).toBeInTheDocument();
    expect(upsertLocation).not.toHaveBeenCalled();

    await userEvent.clear(barcodeInput);
    await userEvent.type(barcodeInput, 'LOC-002');
    await userEvent.click(screen.getByRole('button', { name: /update location/i }));

    expect(await screen.findByText(/location barcode must be unique/i)).toBeInTheDocument();
  });
});
