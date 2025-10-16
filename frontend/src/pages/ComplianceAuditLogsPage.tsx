import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import DataTable from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';
import { api } from '@/lib/api';

interface AuditRecord {
  id: string;
  module: string;
  action: string;
  actor: string;
  timestamp: string;
  status: string;
}

const fallbackAudits: AuditRecord[] = [
  {
    id: 'audit-001',
    module: 'Permits',
    action: 'Approved permit PR-88',
    actor: 'Kim Romero',
    timestamp: '2024-06-05 17:26',
    status: 'Completed',
  },
  {
    id: 'audit-002',
    module: 'Work Orders',
    action: 'Updated priority on WO-231',
    actor: 'Jordan Chen',
    timestamp: '2024-06-05 13:08',
    status: 'In Progress',
  },
  {
    id: 'audit-003',
    module: 'Inventory',
    action: 'Adjusted quantity for Bearing 6203-ZZ',
    actor: 'Avery Johnson',
    timestamp: '2024-06-04 08:54',
    status: 'Open',
  },
];

const parseAudits = (payload: unknown): AuditRecord[] => {
  if (Array.isArray(payload)) {
    return payload as AuditRecord[];
  }
  if (payload && typeof payload === 'object') {
    const source = (payload as { data?: unknown; items?: unknown; records?: unknown }).data ??
      (payload as { data?: unknown; items?: unknown; records?: unknown }).items ??
      (payload as { data?: unknown; items?: unknown; records?: unknown }).records;
    if (Array.isArray(source)) {
      return source as AuditRecord[];
    }
  }
  return [];
};

export default function ComplianceAuditLogsPage() {
  const [audits, setAudits] = useState<AuditRecord[]>(fallbackAudits);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    api
      .get('/compliance')
      .then((response) => {
        if (!active) return;
        const nextAudits = parseAudits(response.data);
        if (nextAudits.length) {
          setAudits(nextAudits);
        }
      })
      .catch(() => {
        toast.error('Failed to load compliance logs');
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="p-6 text-gray-200 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold mb-2">Compliance / Audit Logs</h1>
        <p className="text-sm text-slate-300">
          Maintain traceability for regulatory events, approvals, and system configuration changes.
        </p>
      </div>

      <DataTable
        keyField="id"
        data={audits}
        isLoading={isLoading}
        columns={[
          { header: 'Module', accessor: 'module' },
          { header: 'Action', accessor: 'action' },
          { header: 'Actor', accessor: 'actor' },
          { header: 'Timestamp', accessor: 'timestamp' },
          {
            header: 'Status',
            accessor: (record) => <StatusBadge status={record.status} size="sm" />,
          },
        ]}
        className="rounded-xl border border-slate-800 bg-slate-900/60"
      />
    </div>
  );
}
