import React from 'react';
import { AlertTriangle, ClipboardList, Wrench } from 'lucide-react';
import { Card, EmptyState, FilterBar, SectionHeader, StatCard, StatusPill, UiDataTable } from '@/components/ui';
import FormField from '@/components/ui/FormField';

const rows = [
  { id: 'WO-101', title: 'Bearing replacement', status: 'in_progress', priority: 'high' },
  { id: 'WO-102', title: 'Conveyor alignment', status: 'requested', priority: 'medium' },
  { id: 'WO-103', title: 'PLC diagnostics', status: 'completed', priority: 'low' },
];

export default function UiPlayground() {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="WorkPro UI Playground"
        subtitle="Preview the reusable WorkPro UI kit components"
      />

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Open work orders" value={42} hint="Across all departments" icon={ClipboardList} />
        <StatCard label="Overdue" value={6} hint="Needs immediate attention" icon={AlertTriangle} />
        <StatCard label="PM Compliance" value="96.2%" hint="Rolling 30 days" icon={Wrench} />
      </section>

      <FilterBar>
        <FormField label="Department">
          <select className="rounded-lg border border-[var(--wp-color-border)] bg-transparent px-3 py-2 text-sm">
            <option>All departments</option>
            <option>Packaging</option>
            <option>Assembly</option>
          </select>
        </FormField>
        <FormField label="Status">
          <select className="rounded-lg border border-[var(--wp-color-border)] bg-transparent px-3 py-2 text-sm">
            <option>All statuses</option>
            <option>Open</option>
            <option>Completed</option>
          </select>
        </FormField>
      </FilterBar>

      <Card>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-[var(--wp-color-text-muted)]">Status examples:</span>
          <StatusPill value="requested" />
          <StatusPill value="in_progress" />
          <StatusPill value="completed" />
          <StatusPill value="cancelled" />
        </div>
      </Card>

      <UiDataTable
        title="Sample Work Orders"
        columns={[
          { id: 'id', header: 'ID', accessor: 'id' },
          { id: 'title', header: 'Title', accessor: 'title' },
          { id: 'status', header: 'Status', accessor: (row) => <StatusPill value={row.status} /> },
          { id: 'priority', header: 'Priority', accessor: 'priority' },
        ]}
        data={rows}
        keyField="id"
        stickyHeader
      />

      <EmptyState
        title="No additional components"
        description="Add more kit components here during iterative UI upgrades."
      />
    </div>
  );
}
