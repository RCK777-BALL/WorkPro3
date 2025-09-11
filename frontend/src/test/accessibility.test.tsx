import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import DataTable from '@/components/common/DataTable';
import { describe, it, expect } from 'vitest';

type Row = { id: number; name: string; };

const columns = [
  { header: 'ID', accessor: 'id' as const },
  { header: 'Name', accessor: 'name' as const },
];

const data: Row[] = [
  { id: 1, name: 'Test' },
];

describe('Accessibility', () => {
  it('DataTable has no basic a11y violations', async () => {
    const { container } = render(
      <DataTable<Row> columns={columns} data={data} keyField="id" />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
