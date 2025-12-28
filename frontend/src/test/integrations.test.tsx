/*
 * SPDX-License-Identifier: MIT
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Integrations from '@/integrations/Integrations';

describe('Integrations page', () => {
  it('registers a hook', async () => {
    const fetchMock = vi
      .fn()
      // initial data calls
      .mockResolvedValueOnce({ json: () => Promise.resolve({ data: { integrationHooks: [] } }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ data: [] }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ data: ['integrations.manage'] }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ data: [] }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ data: [] }) })
      // register hook
      .mockResolvedValueOnce({ json: () => Promise.resolve({ _id: '1', name: 'Test', type: 'webhook' }) });
    vi.stubGlobal('fetch', fetchMock);

    render(<Integrations />);

    fireEvent.change(screen.getByPlaceholderText('name'), { target: { value: 'Test' } });
    fireEvent.change(screen.getByPlaceholderText('url'), { target: { value: 'http://example.com' } });
    fireEvent.click(screen.getByText('Register'));

    await screen.findByText('Test - webhook');
    expect(fetchMock).toHaveBeenCalledTimes(6);

    vi.unstubAllGlobals();
  });
});
