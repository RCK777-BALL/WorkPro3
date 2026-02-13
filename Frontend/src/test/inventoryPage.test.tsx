/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Inventory from '@/pages/Inventory';

const mockUsePartsQuery = vi.fn();
const mockUseAlertsQuery = vi.fn();

vi.mock('@/features/inventory', () => ({
  AlertsPanel: () => <div>AlertsPanel</div>,
  InventoryAlertIndicator: () => <div>AlertIndicator</div>,
  PartsTableView: () => <div>PartsTable</div>,
  PdfExportPanel: () => <div>PdfExportPanel</div>,
  PurchaseOrderBuilder: () => <div>PurchaseOrderBuilder</div>,
  PurchaseOrderExportPanel: () => <div>PurchaseOrderExportPanel</div>,
  VendorListPanel: () => <div>VendorListPanel</div>,
  useAlertsQuery: () => mockUseAlertsQuery(),
  usePartsQuery: () => mockUsePartsQuery(),
}));

vi.mock('@/auth/usePermissions', () => ({
  usePermissions: () => ({
    can: (permission: string) => permission === 'inventory.read',
  }),
}));

describe('Inventory page', () => {
  beforeEach(() => {
    mockUsePartsQuery.mockReturnValue({
      data: {
        total: 12,
        items: [{ id: 'p1', assets: [{ id: 'a1' }, { id: 'a2' }] }, { id: 'p2', assets: [] }],
      },
      isLoading: false,
      error: null,
    });
    mockUseAlertsQuery.mockReturnValue({
      data: { openCount: 3, items: [] },
      isLoading: false,
      error: null,
    });
  });

  it('renders inventory summary and panels', () => {
    render(<Inventory />);

    expect(screen.getByText('Inventory intelligence')).toBeTruthy();
    expect(screen.getByText('AlertsPanel')).toBeTruthy();
    expect(screen.getByText('PartsTable')).toBeTruthy();
    expect(screen.getByText('VendorListPanel')).toBeTruthy();

    const activeParts = screen.getByText('Active parts').closest('div');
    expect(activeParts).not.toBeNull();
    expect(within(activeParts as HTMLElement).getByText('12')).toBeTruthy();

    const linkedAssets = screen.getByText('Linked assets').closest('div');
    expect(linkedAssets).not.toBeNull();
    expect(within(linkedAssets as HTMLElement).getByText('2')).toBeTruthy();

    const alerts = screen.getByText('Alerts').closest('div');
    expect(alerts).not.toBeNull();
    expect(within(alerts as HTMLElement).getByText('3')).toBeTruthy();
  });

  it('shows permission guidance when inventory manage is unavailable', () => {
    render(<Inventory />);

    expect(screen.getByText('Insufficient permissions to allocate parts.')).toBeTruthy();
  });
});
