import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import DataTable from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';
import { api } from '@/lib/api';

interface IntegrationRecord {
  id: string;
  integration: string;
  type: string;
  status: string;
  lastSync: string;
}

const fallbackIntegrations: IntegrationRecord[] = [
  {
    id: 'integration-001',
    integration: 'SAP ERP',
    type: 'Work Order Sync',
    status: 'In Progress',
    lastSync: '2024-06-06 05:15',
  },
  {
    id: 'integration-002',
    integration: 'Power BI',
    type: 'Analytics Feed',
    status: 'Completed',
    lastSync: '2024-06-05 22:00',
  },
  {
    id: 'integration-003',
    integration: 'Twilio SMS',
    type: 'Notifications',
    status: 'Open',
    lastSync: '2024-06-04 14:33',
  },
];

const parseIntegrations = (payload: unknown): IntegrationRecord[] => {
  if (Array.isArray(payload)) {
    return payload as IntegrationRecord[];
  }
  if (payload && typeof payload === 'object') {
    const source = (payload as { data?: unknown; items?: unknown; records?: unknown }).data ??
      (payload as { data?: unknown; items?: unknown; records?: unknown }).items ??
      (payload as { data?: unknown; items?: unknown; records?: unknown }).records;
    if (Array.isArray(source)) {
      return source as IntegrationRecord[];
    }
  }
  return [];
};

export default function IntegrationsApiPage() {
  const [integrations, setIntegrations] = useState<IntegrationRecord[]>(fallbackIntegrations);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    api
      .get('/integrations/summary')
      .then((response) => {
        if (!active) return;
        const nextIntegrations = parseIntegrations(response.data);
        if (nextIntegrations.length) {
          setIntegrations(nextIntegrations);
        }
      })
      .catch(() => {
        toast.error('Failed to load integration status');
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
        <h1 className="text-2xl font-semibold mb-2">Integrations / API</h1>
        <p className="text-sm text-slate-300">
          Monitor connectors, API clients, and last sync health across the platform.
        </p>
      </div>

      <DataTable
        keyField="id"
        data={integrations}
        isLoading={isLoading}
        columns={[
          { header: 'Integration', accessor: 'integration' },
          { header: 'Type', accessor: 'type' },
          { header: 'Last Sync', accessor: 'lastSync' },
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
