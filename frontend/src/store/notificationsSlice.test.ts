/*
 * SPDX-License-Identifier: MIT
 */

import { describe, expect, it, beforeEach, vi } from 'vitest';

import { useNotificationsStore } from './notificationsSlice';
import { acknowledgeAlert, clearAlert, fetchStockAlerts } from '@/api/alerts';
import { fetchInventoryAlerts } from '@/api/inventory';

vi.mock('@/api/alerts');
vi.mock('@/api/inventory');

const mockLowStock = [
  {
    id: 'a1',
    partId: 'p1',
    partName: 'Bolt',
    quantity: 1,
    reorderPoint: 3,
    status: 'open',
    assetNames: [],
    pmTemplateTitles: [],
  },
];

describe('notificationsSlice', () => {
  beforeEach(() => {
    useNotificationsStore.getState().reset();
    vi.mocked(fetchInventoryAlerts).mockReset();
    vi.mocked(fetchStockAlerts).mockReset();
    vi.mocked(acknowledgeAlert).mockReset();
    vi.mocked(clearAlert).mockReset();
  });

  it('loads low stock alerts using configured thresholds', async () => {
    vi.mocked(fetchInventoryAlerts).mockResolvedValue({
      items: mockLowStock as any,
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
      openCount: 1,
    } as any);

    await useNotificationsStore.getState().fetchLowStock();

    const alerts = useNotificationsStore.getState().lowStockAlerts;
    expect(alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'p1', reorderPoint: 3, quantity: 1 }),
      ]),
    );
  });

  it('acknowledges alerts optimistically and keeps state on success', async () => {
    useNotificationsStore.setState({
      lowStockAlerts: [{ id: 'p1', partId: 'p1', partName: 'Bolt', quantity: 1, reorderPoint: 3, assetNames: [], pmTemplateTitles: [] } as any],
    });
    vi.mocked(acknowledgeAlert).mockResolvedValue({ ...mockLowStock[0], status: 'approved' } as any);

    await useNotificationsStore.getState().acknowledge('p1');

    expect(useNotificationsStore.getState().lowStockAlerts[0].acknowledged).toBe(true);
  });

  it('reverts clear when API fails', async () => {
    useNotificationsStore.setState({
      lowStockAlerts: [
        {
          id: 'p1',
          partId: 'p1',
          status: 'open',
          partName: 'Bolt',
          quantity: 1,
          reorderPoint: 3,
          assetNames: [],
          pmTemplateTitles: [],
        } as any,
      ],
    });
    vi.mocked(clearAlert).mockRejectedValue(new Error('nope'));

    await useNotificationsStore.getState().clear('p1');

    const state = useNotificationsStore.getState();
    expect(state.lowStockAlerts).toHaveLength(1);
    expect(state.alertsError).toContain('clear');
  });
});
