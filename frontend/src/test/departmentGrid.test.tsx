/*
 * SPDX-License-Identifier: MIT
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DepartmentHierarchyGrid from '@/components/departments/DepartmentHierarchyGrid';
import type { DepartmentHierarchy } from '@/types';
import { describe, expect, it } from 'vitest';

describe('DepartmentHierarchyGrid', () => {
  const department: DepartmentHierarchy = {
    id: 'd1',
    name: 'Dept',
    plant: { id: 'p1', name: 'Plant 1' },
    lines: [
      {
        id: 'l1',
        name: 'Line1',
        department: 'd1',
            stations: [
              {
                id: 's1',
                name: 'Station1',
                line: 'l1',
                assets: [
                { id: 'a1', name: 'Pump', type: 'Mechanical', tenantId: 't1' },
                { id: 'a2', name: 'Motor', type: 'Electrical', tenantId: 't1' },
                ],
              },
            ],
          },
    ],
  };

  const noop = () => {};

  it('toggles line and station expansion', async () => {
    render(
      <DepartmentHierarchyGrid
        department={department}
        onCreateLine={noop}
        onUpdateLine={noop}
        onDeleteLine={noop}
        onCreateStation={noop}
        onUpdateStation={noop}
        onDeleteStation={noop}
        onCreateAsset={noop}
        onUpdateAsset={noop}
        onDeleteAsset={noop}
      />
    );

    expect(screen.queryByDisplayValue('Station1')).toBeNull();
    await userEvent.click(screen.getByDisplayValue('Line1'));
    expect(screen.getByDisplayValue('Station1')).toBeInTheDocument();
    await userEvent.click(screen.getByDisplayValue('Station1'));
    expect(screen.getByDisplayValue('Pump')).toBeInTheDocument();
    await userEvent.click(screen.getByDisplayValue('Station1'));
    expect(screen.queryByDisplayValue('Pump')).toBeNull();
  });

  it('filters assets by search and type', async () => {
    render(
      <DepartmentHierarchyGrid
        department={department}
        onCreateLine={noop}
        onUpdateLine={noop}
        onDeleteLine={noop}
        onCreateStation={noop}
        onUpdateStation={noop}
        onDeleteStation={noop}
        onCreateAsset={noop}
        onUpdateAsset={noop}
        onDeleteAsset={noop}
      />
    );

    await userEvent.click(screen.getByDisplayValue('Line1'));
    await userEvent.click(screen.getByDisplayValue('Station1'));

    const search = screen.getByPlaceholderText('Search assets...');
    await userEvent.type(search, 'pump');
    expect(screen.getByDisplayValue('Pump')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Motor')).toBeNull();

    await userEvent.clear(search);
    const select = screen.getAllByRole('combobox')[0];
    await userEvent.selectOptions(select, 'Electrical');
    expect(screen.queryByDisplayValue('Pump')).toBeNull();
    expect(screen.getByDisplayValue('Motor')).toBeInTheDocument();
  });
});
