/*
 * SPDX-License-Identifier: MIT
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, beforeEach, vi } from 'vitest';

import DowntimeLogsPage from '@/pages/DowntimeLogsPage';
import {
  createDowntimeLog,
  fetchDowntimeAssets,
  fetchDowntimeWorkOrders,
  listDowntimeLogs,
  updateDowntimeLog,
} from '@/api/downtime';

const {
  listMock,
  createMock,
  updateMock,
  assetsMock,
  workOrdersMock,
  hookMock,
} = vi.hoisted(() => ({
  listMock: vi.fn(),
  createMock: vi.fn(),
  updateMock: vi.fn(),
  assetsMock: vi.fn(),
  workOrdersMock: vi.fn(),
  hookMock: vi.fn(),
}));

vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

vi.mock('@/api/downtime', () => ({
  listDowntimeLogs: listMock,
  createDowntimeLog: createMock,
  updateDowntimeLog: updateMock,
  fetchDowntimeAssets: assetsMock,
  fetchDowntimeWorkOrders: workOrdersMock,
  useDowntimeLogsQuery: hookMock,
  downtimeKeys: {
    all: ['downtime-logs'],
    filters: (filters: unknown) => ['downtime-logs', filters],
    assets: ['downtime-assets'],
    workOrders: ['downtime-workorders'],
  },
}));

const mockedList = vi.mocked(listMock);
const mockedCreate = vi.mocked(createMock);
const mockedUpdate = vi.mocked(updateMock);
const mockedAssets = vi.mocked(assetsMock);
const mockedWorkOrders = vi.mocked(workOrdersMock);
const mockedUseDowntime = vi.mocked(hookMock);

const renderPage = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <DowntimeLogsPage />
    </QueryClientProvider>,
  );
};

const baseLogs = [
  {
    id: 'log-1',
    assetId: 'asset-1',
    workOrderId: 'wo-1',
    start: '2024-01-01T10:00',
    end: '2024-01-01T11:00',
    cause: 'Power loss',
    impact: 'Production stoppage',
  },
  {
    id: 'log-2',
    assetId: 'asset-2',
    start: '2024-01-02T12:00',
    end: '2024-01-02T13:15',
    cause: 'Coolant flush',
    impact: 'Minor slowdown',
  },
];

beforeEach(() => {
  mockedList.mockReset();
  mockedCreate.mockReset();
  mockedUpdate.mockReset();
  mockedAssets.mockReset();
  mockedWorkOrders.mockReset();
  mockedUseDowntime.mockReset();
  mockedList.mockResolvedValue(baseLogs as any);
  mockedCreate.mockResolvedValue({ ...baseLogs[1], id: 'log-3' } as any);
  mockedUpdate.mockResolvedValue(baseLogs[0] as any);
  mockedUseDowntime.mockReturnValue({ data: baseLogs as any, isLoading: false } as any);
  mockedAssets.mockResolvedValue([
    { id: 'asset-1', name: 'Press A' },
    { id: 'asset-2', name: 'Lathe B' },
  ]);
  mockedWorkOrders.mockResolvedValue([{ id: 'wo-1', title: 'Motor repair', assetId: 'asset-1' }]);
});

describe('DowntimeLogsPage', () => {
  it('filters downtime rows by search and asset', async () => {
    renderPage();

    expect(await screen.findByText('Power loss')).toBeInTheDocument();
    const searchInput = screen.getByPlaceholderText(/search cause/i);
    await userEvent.type(searchInput, 'coolant');

    await waitFor(() => {
      expect(screen.queryByText('Power loss')).not.toBeInTheDocument();
      expect(screen.getByText('Coolant flush')).toBeInTheDocument();
    });

    await userEvent.clear(searchInput);

    await userEvent.selectOptions(screen.getByTestId('asset-filter'), 'asset-1');

    await waitFor(() => {
      expect(screen.getByText('Power loss')).toBeInTheDocument();
      expect(screen.queryByText('Coolant flush')).not.toBeInTheDocument();
    });
  });

  it('blocks overlapping downtime entries for the same asset', async () => {
    renderPage();

    expect(await screen.findByText('Power loss')).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByTestId('asset-select'), 'asset-1');
    await userEvent.type(screen.getByLabelText(/Start time/i), '2024-01-01T10:30');
    await userEvent.type(screen.getByLabelText(/End time/i), '2024-01-01T11:30');
    await userEvent.type(screen.getByLabelText(/Cause/i), 'Overlap test');
    await userEvent.type(screen.getByLabelText(/Impact/i), 'Test');

    await userEvent.click(screen.getByRole('button', { name: /save downtime/i }));

    await waitFor(() => {
      expect(mockedCreate).not.toHaveBeenCalled();
      expect(screen.getAllByText(/cannot overlap/i).length).toBeGreaterThan(0);
    });
  });

  it('updates a downtime entry when editing', async () => {
    renderPage();

    expect(await screen.findByText('Power loss')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /edit downtime log-1/i }));
    const causeInput = screen.getByLabelText(/Cause/i);
    await userEvent.clear(causeInput);
    await userEvent.type(causeInput, 'Updated cause');

    await userEvent.click(screen.getByRole('button', { name: /update entry/i }));

    await waitFor(() => {
      expect(mockedUpdate).toHaveBeenCalledWith('log-1', expect.objectContaining({
        assetId: 'asset-1',
        cause: 'Updated cause',
      }));
    });
  });
});
