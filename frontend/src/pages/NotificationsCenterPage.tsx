import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import DataTable from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';
import { api } from '@/lib/api';

interface NotificationRecord {
  id: string;
  message: string;
  channel: string;
  createdAt: string;
  status: string;
}

const fallbackNotifications: NotificationRecord[] = [
  {
    id: 'notify-001',
    message: 'Work order WO-231 was completed.',
    channel: 'In-App',
    createdAt: '2024-06-06 09:14',
    status: 'Completed',
  },
  {
    id: 'notify-002',
    message: 'Permit PR-88 awaiting approval.',
    channel: 'Email',
    createdAt: '2024-06-05 17:24',
    status: 'Pending Approval',
  },
  {
    id: 'notify-003',
    message: 'Inventory low on Bearing 6203-ZZ.',
    channel: 'SMS',
    createdAt: '2024-06-05 08:45',
    status: 'Open',
  },
];

const parseNotifications = (payload: unknown): NotificationRecord[] => {
  if (Array.isArray(payload)) {
    return payload as NotificationRecord[];
  }
  if (payload && typeof payload === 'object') {
    const source = (payload as { data?: unknown; items?: unknown; records?: unknown }).data ??
      (payload as { data?: unknown; items?: unknown; records?: unknown }).items ??
      (payload as { data?: unknown; items?: unknown; records?: unknown }).records;
    if (Array.isArray(source)) {
      return source as NotificationRecord[];
    }
  }
  return [];
};

export default function NotificationsCenterPage() {
  const [notifications, setNotifications] = useState<NotificationRecord[]>(fallbackNotifications);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    api
      .get('/notifications/summary')
      .then((response) => {
        if (!active) return;
        const nextNotifications = parseNotifications(response.data);
        if (nextNotifications.length) {
          setNotifications(nextNotifications);
        }
      })
      .catch(() => {
        toast.error('Failed to load notifications');
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
        <h1 className="text-2xl font-semibold mb-2">Notifications</h1>
        <p className="text-sm text-slate-300">
          Review system alerts, escalations, and communications from across the CMMS.
        </p>
      </div>

      <DataTable
        keyField="id"
        data={notifications}
        isLoading={isLoading}
        columns={[
          { header: 'Message', accessor: 'message' },
          { header: 'Channel', accessor: 'channel' },
          { header: 'Created', accessor: 'createdAt' },
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
