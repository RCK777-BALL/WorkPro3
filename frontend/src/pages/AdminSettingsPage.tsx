import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import DataTable from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';
import { api } from '@/lib/api';

interface AdminSetting {
  id: string;
  setting: string;
  description: string;
  owner: string;
  status: string;
}

const fallbackSettings: AdminSetting[] = [
  {
    id: 'admin-001',
    setting: 'Site Configuration',
    description: 'Manage sites, locations, and asset hierarchies',
    owner: 'System Admin',
    status: 'Open',
  },
  {
    id: 'admin-002',
    setting: 'Role Permissions',
    description: 'Adjust user roles and access control policies',
    owner: 'Security',
    status: 'In Progress',
  },
  {
    id: 'admin-003',
    setting: 'API Access',
    description: 'Rotate API keys and webhook endpoints',
    owner: 'Platform',
    status: 'Completed',
  },
];

const parseSettings = (payload: unknown): AdminSetting[] => {
  if (Array.isArray(payload)) {
    return payload as AdminSetting[];
  }
  if (payload && typeof payload === 'object') {
    const source = (payload as { data?: unknown; items?: unknown; records?: unknown }).data ??
      (payload as { data?: unknown; items?: unknown; records?: unknown }).items ??
      (payload as { data?: unknown; items?: unknown; records?: unknown }).records;
    if (Array.isArray(source)) {
      return source as AdminSetting[];
    }
  }
  return [];
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminSetting[]>(fallbackSettings);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    api
      .get('/admin')
      .then((response) => {
        if (!active) return;
        const nextSettings = parseSettings(response.data);
        if (nextSettings.length) {
          setSettings(nextSettings);
        }
      })
      .catch(() => {
        toast.error('Failed to load admin settings');
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
        <h1 className="text-2xl font-semibold mb-2">Admin Settings</h1>
        <p className="text-sm text-slate-300">
          Configure tenants, roles, and system preferences to tailor WorkPro to your organization.
        </p>
      </div>

      <DataTable
        keyField="id"
        data={settings}
        isLoading={isLoading}
        columns={[
          { header: 'Setting', accessor: 'setting' },
          { header: 'Description', accessor: 'description' },
          { header: 'Owner', accessor: 'owner' },
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
