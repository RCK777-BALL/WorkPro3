/*
 * SPDX-License-Identifier: MIT
 */

import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, beforeEach, expect, vi } from 'vitest';

import PurchaseOrderPage from './PurchaseOrderPage';

const mockListPurchaseOrders = vi.fn();
const mockCreatePurchaseOrder = vi.fn();
const mockUpdatePurchaseOrderStatus = vi.fn();

vi.mock('@/api/purchasing', () => ({
  listPurchaseOrders: () => mockListPurchaseOrders(),
  createPurchaseOrder: (payload: any) => mockCreatePurchaseOrder(payload),
  updatePurchaseOrderStatus: (id: string, status: string) =>
    mockUpdatePurchaseOrderStatus(id, status),
}));

vi.mock('@/hooks/useVendors', () => ({
  useVendors: () => ({ data: [{ id: 'v-1', name: 'Vendor One', email: 'vendor@example.com' }] }),
}));

describe('PurchaseOrderPage', () => {
  beforeEach(() => {
    mockListPurchaseOrders.mockResolvedValue([]);
    mockCreatePurchaseOrder.mockResolvedValue({
      id: 'po-new',
      status: 'Draft',
      vendorId: 'v-1',
      lines: [{ part: 'part-1', qtyOrdered: 2 }],
    });
    mockUpdatePurchaseOrderStatus.mockResolvedValue({
      id: 'po-1',
      status: 'Pending',
      vendorId: 'v-1',
      lines: [],
    });
  });

  it('validates draft creation input before submitting', async () => {
    render(<PurchaseOrderPage />);
    await waitFor(() => expect(mockListPurchaseOrders).toHaveBeenCalled());

    await userEvent.click(screen.getByRole('button', { name: /create/i }));

    expect(screen.getByText(/vendor, item, and quantity are required/i)).toBeInTheDocument();
    expect(mockCreatePurchaseOrder).not.toHaveBeenCalled();
  });

  it('creates a draft and surfaces it in the table', async () => {
    render(<PurchaseOrderPage />);
    await waitFor(() => expect(mockListPurchaseOrders).toHaveBeenCalled());

    await userEvent.selectOptions(screen.getByRole('combobox'), 'v-1');
    await userEvent.type(screen.getByPlaceholderText('Item ID'), 'part-123');
    await userEvent.type(screen.getByPlaceholderText('Quantity'), '2');
    await userEvent.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => expect(mockCreatePurchaseOrder).toHaveBeenCalled());
    expect(mockCreatePurchaseOrder).toHaveBeenCalledWith({
      vendorId: 'v-1',
      lines: [{ part: 'part-123', qtyOrdered: 2 }],
    });

    expect(await screen.findByText(/po-new/i)).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('advances status and reflects timeline updates', async () => {
    mockListPurchaseOrders.mockResolvedValue([
      { id: 'po-1', status: 'Draft', vendorId: 'v-1', lines: [] },
    ]);

    render(<PurchaseOrderPage />);
    await waitFor(() => expect(mockListPurchaseOrders).toHaveBeenCalled());

    await userEvent.click(screen.getByRole('button', { name: /move to pending/i }));

    await waitFor(() => expect(mockUpdatePurchaseOrderStatus).toHaveBeenCalledWith('po-1', 'Pending'));
    expect(await screen.findByText('Pending')).toBeInTheDocument();
  });
});
