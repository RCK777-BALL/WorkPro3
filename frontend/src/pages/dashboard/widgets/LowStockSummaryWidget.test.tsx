/*
 * SPDX-License-Identifier: MIT
 */

import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, beforeEach, vi } from 'vitest';

import { LowStockSummaryWidget } from './LowStockSummaryWidget';
import { useNotificationsStore } from '@/store/notificationsSlice';
import { fetchInventoryAlerts } from '@/api/inventory';
import { acknowledgeAlert, clearAlert } from '@/api/alerts';

vi.mock('@/api/inventory');
vi.mock('@/api/alerts');

const sampleAlert = {
  partId: 'p1',
  partName: 'Hydraulic Hose',
  quantity: 1,
  reorderPoint: 2,
  assetNames: [],
  pmTemplateTitles: [],
};

describe('LowStockSummaryWidget', () => {
  beforeEach(() => {
    useNotificationsStore.getState().reset();
    vi.mocked(fetchInventoryAlerts).mockReset();
    vi.mocked(acknowledgeAlert).mockReset();
    vi.mocked(clearAlert).mockReset();
  });

  it('renders low stock alerts and acknowledges optimistically', async () => {
    useNotificationsStore.setState((state) => ({
      ...state,
      lowStockAlerts: [{ ...sampleAlert, id: 'p1' } as any],
      fetchLowStock: vi.fn(),
    }));
    vi.mocked(acknowledgeAlert).mockResolvedValue({ success: true } as any);

    render(<LowStockSummaryWidget />);

    expect(await screen.findByText('Hydraulic Hose')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Ack/i }));

    await waitFor(() => expect(useNotificationsStore.getState().lowStockAlerts[0].acknowledged).toBe(true));
  });

  it('surfaces errors and restores alert when clear fails', async () => {
    useNotificationsStore.setState((state) => ({
      ...state,
      lowStockAlerts: [{ ...sampleAlert, id: 'p1' } as any],
      fetchLowStock: vi.fn(),
    }));
    vi.mocked(clearAlert).mockRejectedValue(new Error('fail'));

    render(<LowStockSummaryWidget />);

    const clearButton = await screen.findByRole('button', { name: /Clear/i });
    await userEvent.click(clearButton);

    await waitFor(() => expect(screen.getByText(/Unable to clear alert/)).toBeInTheDocument());
    expect(useNotificationsStore.getState().lowStockAlerts).toHaveLength(1);
  });
});

