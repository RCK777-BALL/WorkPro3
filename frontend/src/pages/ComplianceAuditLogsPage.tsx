import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { RefreshCw } from 'lucide-react';

import DataTable from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import http from '@/lib/http';

type AuditDiff = Record<string, unknown> | null | undefined;

interface AuditRecord {
  id: string;
  module: string;
  action: string;
  actor: string;
  timestamp: string;
  status: string;
  entityType: string;
  entityId?: string;
  summary?: string | null;
  changeSummary?: string | null;
  before?: AuditDiff;
  after?: AuditDiff;
}

const toDisplayTime = (value: string) => {
  try {
    return new Date(value).toLocaleString();
  } catch (error) {
    return value;
  }
};

export default function ComplianceAuditLogsPage() {
  const [audits, setAudits] = useState<AuditRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [selectedAudit, setSelectedAudit] = useState<AuditRecord | null>(null);

  const fetchAudits = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await http.get<AuditRecord[]>('/compliance', { params: { limit: 200 } });
      setAudits(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      toast.error('Failed to load compliance logs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAudits();
  }, [fetchAudits]);

  const modules = useMemo(() => {
    const unique = new Set<string>();
    audits.forEach((audit) => {
      if (audit.module) {
        unique.add(audit.module);
      }
    });
    return ['all', ...Array.from(unique).sort((a, b) => a.localeCompare(b))];
  }, [audits]);

  const visibleAudits = useMemo(() => {
    if (filter === 'all') {
      return audits;
    }
    return audits.filter((audit) => audit.module === filter);
  }, [audits, filter]);

  const handleViewDetails = (audit: AuditRecord) => {
    setSelectedAudit(audit);
  };

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      setSelectedAudit(null);
    }
  };

  return (
    <div className="p-6 text-gray-200 space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Compliance / Audit Logs</h1>
          <p className="text-sm text-slate-300">
            Maintain traceability for regulatory events, approvals, and system configuration changes.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchAudits}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
        </div>
      </div>

      {modules.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {modules.map((module) => (
            <Button
              key={module}
              type="button"
              variant={filter === module ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(module)}
            >
              {module === 'all' ? 'All Modules' : module}
            </Button>
          ))}
        </div>
      )}

      <DataTable
        keyField="id"
        data={visibleAudits}
        isLoading={isLoading}
        emptyMessage={isLoading ? 'Loading logs…' : 'No audit entries found'}
        columns={[
          { header: 'Module', accessor: 'module' },
          {
            header: 'Action',
            accessor: (record) => (
              <div className="flex flex-col">
                <span className="font-medium">{record.action}</span>
                {record.changeSummary ? (
                  <span className="text-xs text-slate-400">{record.changeSummary}</span>
                ) : record.summary ? (
                  <span className="text-xs text-slate-500">{record.summary}</span>
                ) : null}
              </div>
            ),
          },
          { header: 'Actor', accessor: 'actor' },
          {
            header: 'Timestamp',
            accessor: (record) => toDisplayTime(record.timestamp),
          },
          {
            header: 'Status',
            accessor: (record) => <StatusBadge status={record.status} size="sm" />,
          },
          {
            header: 'Details',
            accessor: (record) => (
              <Button type="button" variant="ghost" size="sm" onClick={() => handleViewDetails(record)}>
                View
              </Button>
            ),
            className: 'text-right',
          },
        ]}
        className="rounded-xl border border-slate-800 bg-slate-900/60"
      />

      <Dialog open={Boolean(selectedAudit)} onOpenChange={handleDialogChange}>
        <DialogContent className="bg-slate-900 text-slate-100">
          <DialogHeader>
            <DialogTitle>{selectedAudit?.summary ?? selectedAudit?.action}</DialogTitle>
            {selectedAudit?.entityType && selectedAudit?.entityId && (
              <DialogDescription className="text-slate-400">
                {selectedAudit.entityType} {selectedAudit.entityId}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase text-slate-400">Module</p>
                <p className="font-medium text-slate-100">{selectedAudit?.module ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-400">Actor</p>
                <p className="font-medium text-slate-100">{selectedAudit?.actor ?? 'System'}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-400">Timestamp</p>
                <p className="font-medium text-slate-100">
                  {selectedAudit?.timestamp ? toDisplayTime(selectedAudit.timestamp) : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-400">Action</p>
                <p className="font-medium text-slate-100">{selectedAudit?.action ?? '—'}</p>
              </div>
            </div>

            {(selectedAudit?.before || selectedAudit?.after) && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">Before</h3>
                  <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-slate-950/60 p-3 text-xs text-slate-300">
                    {JSON.stringify(selectedAudit?.before ?? null, null, 2)}
                  </pre>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">After</h3>
                  <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-slate-950/60 p-3 text-xs text-slate-300">
                    {JSON.stringify(selectedAudit?.after ?? null, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
