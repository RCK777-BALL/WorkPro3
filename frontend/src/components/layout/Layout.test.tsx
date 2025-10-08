/*
 * SPDX-License-Identifier: MIT
 */

import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi } from 'vitest';
import Layout from '@/components/layout/Layout';

vi.mock('./Header', () => ({ default: () => <div>Header</div> }));
vi.mock('./Sidebar', () => ({ default: () => <div>Sidebar</div> }));
vi.mock('./RightPanel', () => ({ default: () => <div>Right Panel</div> }));

describe('Layout', () => {
  it('renders layout structure with outlet', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<div>Outlet Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Sidebar')).toBeInTheDocument();
    expect(screen.getByText('Header')).toBeInTheDocument();
    expect(screen.getByText('Right Panel')).toBeInTheDocument();
    expect(screen.getByText('Outlet Content')).toBeInTheDocument();
  });
});
