/*
 * SPDX-License-Identifier: MIT
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import type { Mock } from 'vitest';
import QrLabel from './QrLabel';
import { buildQrLabelMarkup } from './qrPrint';

vi.mock('./qrPrint', () => ({
  buildQrLabelMarkup: vi.fn(async () => '<html><body>print</body></html>'),
}));

describe('QrLabel', () => {
  it('shows preview data and triggers print window', async () => {
    const printWindow = {
      document: { write: vi.fn(), close: vi.fn() },
      focus: vi.fn(),
      print: vi.fn(),
    } as any;
    vi.spyOn(window, 'open').mockReturnValue(printWindow);

    const mockedBuild = buildQrLabelMarkup as unknown as Mock;

    render(<QrLabel name="Pump" qrValue="qr" subtitle="Line 1" description="Test" />);

    expect(screen.getByText('Pump')).toBeInTheDocument();
    expect(screen.getByText('Line 1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /print qr label/i }));
    fireEvent.click(screen.getByRole('button', { name: /print selected format/i }));

    await waitFor(() => {
      expect(mockedBuild).toHaveBeenCalledWith(expect.objectContaining({ format: 'standard' }));
      expect(printWindow.document.write).toHaveBeenCalled();
    });
  });
});
