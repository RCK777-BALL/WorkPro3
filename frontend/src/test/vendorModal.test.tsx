/*
 * SPDX-License-Identifier: MIT
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, Mock, vi } from 'vitest';
import VendorModal from '@/components/vendors/VendorModal';

describe('VendorModal', () => {
  it('submits form data', async () => {
    const handleSave = vi.fn();
    render(
      <VendorModal isOpen={true} onClose={() => {}} vendor={null} onSave={handleSave} />
    );
    await userEvent.type(screen.getByLabelText('Name'), 'Acme');
    await userEvent.type(screen.getByLabelText('Contact'), 'contact');
    await userEvent.click(screen.getByRole('button', { name: /add vendor/i }));
    expect(handleSave).toHaveBeenCalledWith({ name: 'Acme', contact: 'contact' });
  });

  it('prefills data when editing', () => {
    render(
      <VendorModal
        isOpen={true}
        onClose={() => {}}
        vendor={{ id: '1', name: 'Vendor1', contact: 'c1' }}
        onSave={() => {}}
      />
    );
    expect(screen.getByDisplayValue('Vendor1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('c1')).toBeInTheDocument();
  });
});

