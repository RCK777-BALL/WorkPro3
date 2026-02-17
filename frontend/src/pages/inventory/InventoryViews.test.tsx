/*
 * SPDX-License-Identifier: MIT
 */

import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import '@testing-library/jest-dom';

import InventoryList from './InventoryList';
import InventoryPartDetail from './InventoryPartDetail';
import { useLocationsQuery, usePartQuery, useStockHistoryQuery, useStockItemsQuery } from '@/features/inventory';

vi.mock('@/features/inventory', async () => {
  const actual = await vi.importActual<typeof import('@/features/inventory')>('@/features/inventory');
  return {
    ...actual,
    useLocationsQuery: vi.fn(),
    usePartQuery: vi.fn(),
    useStockHistoryQuery: vi.fn(),
    useStockItemsQuery: vi.fn(),
  };
});

const mockedLocationsQuery = vi.mocked(useLocationsQuery);
const mockedStockItemsQuery = vi.mocked(useStockItemsQuery);
const mockedPartQuery = vi.mocked(usePartQuery);
const mockedHistoryQuery = vi.mocked(useStockHistoryQuery);

describe('Inventory list filters', () => {
  beforeEach(() => {
    mockedLocationsQuery.mockReturnValue({
      data: [
        { id: 'loc-1', siteId: 'north', store: 'Main', bin: 'A1' },
        { id: 'loc-2', siteId: 'north', store: 'Main', bin: 'B2' },
      ],
      isLoading: false,
      error: null,
    } as any);

    mockedStockItemsQuery.mockReturnValue({
      data: [
        { id: '1', partId: 'p1', part: { name: 'Bolt' }, locationId: 'loc-1', quantity: 5 },
        { id: '2', partId: 'p2', part: { name: 'Nut' }, locationId: 'loc-2', quantity: 3 },
      ],
      isLoading: false,
      error: null,
    } as any);
  });

  it('filters by bin and reflects selection in the table', async () => {
    render(
      <MemoryRouter initialEntries={['/inventory/items']}>
        <Routes>
          <Route path="/inventory/items" element={<InventoryList />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Bolt')).toBeInTheDocument();
    expect(screen.getByText('Nut')).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText(/Bin/i), 'B2');

    await waitFor(() => {
      expect(screen.queryByText('Bolt')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Nut')).toBeInTheDocument();
  });
});

describe('Inventory part detail history', () => {
  beforeEach(() => {
    mockedLocationsQuery.mockReturnValue({
      data: [{ id: 'loc-2', siteId: 'north', store: 'Main', bin: 'B2' }],
      isLoading: false,
      error: null,
    } as any);

    mockedStockItemsQuery.mockReturnValue({
      data: [{ id: '2', partId: 'p2', part: { name: 'Nut' }, locationId: 'loc-2', quantity: 3 }],
      isLoading: false,
      error: null,
    } as any);

    mockedPartQuery.mockReturnValue({
      data: { id: 'p2', name: 'Nut', reorderPoint: 2 },
      isLoading: false,
      error: null,
    } as any);

    mockedHistoryQuery.mockReturnValue({
      data: [
        { id: 'h1', partId: 'p2', stockItemId: '2', delta: 3, createdAt: '2024-01-01', location: { locationId: 'loc-2', bin: 'B2' } },
        { id: 'h2', partId: 'p2', stockItemId: '2', delta: -1, createdAt: '2024-02-01', location: { locationId: 'loc-2', bin: 'A1' } },
      ],
      isLoading: false,
      error: null,
    } as any);
  });

  it('shows filtered history entries and pagination summary', async () => {
    render(
      <MemoryRouter initialEntries={['/inventory/items/p2?bin=B2']}>
        <Routes>
          <Route path="/inventory/items/:partId" element={<InventoryPartDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Nut')).toBeInTheDocument();
    expect(screen.getByText(/Page 1 of 1/)).toBeInTheDocument();
    expect(screen.getByText('+3 on p2')).toBeInTheDocument();
    expect(screen.queryByText('-1 on p2')).not.toBeInTheDocument();
  });
});


