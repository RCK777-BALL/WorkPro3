/*
 * SPDX-License-Identifier: MIT
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import VendorModal from '@/components/vendors/VendorModal';

describe('VendorModal', () => {
    it('submits form data', async () => {
      const handleSave = vi.fn();
      render(
        <VendorModal isOpen={true} onClose={() => {}} vendor={null} onSave={handleSave} />
      );
      await userEvent.type(screen.getByLabelText('Name'), 'Acme');
      await userEvent.type(screen.getByLabelText('Email'), 'contact@example.com');
      await userEvent.type(screen.getByLabelText('Phone'), '123-456');
      await userEvent.click(screen.getByRole('button', { name: /add vendor/i }));
      expect(handleSave).toHaveBeenCalledWith({ name: 'Acme', email: 'contact@example.com', phone: '123-456' });
    });

  it('prefills data when editing', () => {
    render(
        <VendorModal
          isOpen={true}
          onClose={() => {}}
          vendor={{ id: '1', name: 'Vendor1', email: 'vendor@example.com', phone: '555-0100' }}
          onSave={() => {}}
        />
      );
      expect(screen.getByDisplayValue('Vendor1')).toBeInTheDocument();
      expect(screen.getByDisplayValue('vendor@example.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('555-0100')).toBeInTheDocument();
    });
  });

