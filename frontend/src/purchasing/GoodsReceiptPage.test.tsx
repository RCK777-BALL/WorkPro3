/*
 * SPDX-License-Identifier: MIT
 */

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, beforeEach, expect, vi } from 'vitest';

import GoodsReceiptPage from './GoodsReceiptPage';

const mockCreateGoodsReceipt = vi.fn();

vi.mock('@/api/purchasing', () => ({
  createGoodsReceipt: (payload: any) => mockCreateGoodsReceipt(payload),
}));

describe('GoodsReceiptPage', () => {
  beforeEach(() => {
    mockCreateGoodsReceipt.mockResolvedValue({});
  });

  it('requires a PO, item, and quantity before receiving', async () => {
    render(<GoodsReceiptPage />);

    await userEvent.click(screen.getByRole('button', { name: /receive/i }));

    expect(screen.getByText(/po, item, and quantity are required/i)).toBeInTheDocument();
    expect(mockCreateGoodsReceipt).not.toHaveBeenCalled();
  });

  it('submits a receipt and clears the form', async () => {
    render(<GoodsReceiptPage />);

    await userEvent.type(screen.getByPlaceholderText('PO ID'), 'po-1');
    await userEvent.type(screen.getByPlaceholderText('Item ID'), 'part-9');
    await userEvent.type(screen.getByPlaceholderText('Quantity'), '4');
    await userEvent.click(screen.getByRole('button', { name: /receive/i }));

    expect(mockCreateGoodsReceipt).toHaveBeenCalledWith({
      purchaseOrder: 'po-1',
      items: [{ item: 'part-9', quantity: 4 }],
    });

    expect(screen.getByPlaceholderText('PO ID')).toHaveValue('');
    expect(screen.getByPlaceholderText('Item ID')).toHaveValue('');
    expect(screen.getByPlaceholderText('Quantity')).toHaveValue(0);
  });
});
