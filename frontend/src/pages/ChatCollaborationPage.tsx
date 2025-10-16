import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import DataTable from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';
import { api } from '@/lib/api';

interface ChatThread {
  id: string;
  thread: string;
  participants: string[];
  lastMessage: string;
  updatedAt: string;
  status: string;
}

const fallbackThreads: ChatThread[] = [
  {
    id: 'chat-001',
    thread: 'Line A - Shift Handoff',
    participants: ['Avery', 'Jordan', 'Priya'],
    lastMessage: 'Night shift logged motor vibration spike.',
    updatedAt: '2024-06-06 07:45',
    status: 'Open',
  },
  {
    id: 'chat-002',
    thread: 'Safety Permit Review',
    participants: ['Kim', 'Safety Team'],
    lastMessage: 'Awaiting approval from EHS lead.',
    updatedAt: '2024-06-05 15:10',
    status: 'Pending Approval',
  },
  {
    id: 'chat-003',
    thread: 'PM Optimization',
    participants: ['Reliability', 'Maintenance'],
    lastMessage: 'Updated lubrication cadence shared.',
    updatedAt: '2024-06-04 11:02',
    status: 'Completed',
  },
];

const parseThreads = (payload: unknown): ChatThread[] => {
  if (Array.isArray(payload)) {
    return payload as ChatThread[];
  }
  if (payload && typeof payload === 'object') {
    const source = (payload as { data?: unknown; items?: unknown; records?: unknown }).data ??
      (payload as { data?: unknown; items?: unknown; records?: unknown }).items ??
      (payload as { data?: unknown; items?: unknown; records?: unknown }).records;
    if (Array.isArray(source)) {
      return source as ChatThread[];
    }
  }
  return [];
};

export default function ChatCollaborationPage() {
  const [threads, setThreads] = useState<ChatThread[]>(fallbackThreads);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    api
      .get('/chat/summary')
      .then((response) => {
        if (!active) return;
        const nextThreads = parseThreads(response.data);
        if (nextThreads.length) {
          setThreads(nextThreads);
        }
      })
      .catch(() => {
        toast.error('Failed to load collaboration threads');
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
        <h1 className="text-2xl font-semibold mb-2">Chat / Collaboration</h1>
        <p className="text-sm text-slate-300">
          Keep teams aligned with shared context, shift handoffs, and live coordination.
        </p>
      </div>

      <DataTable
        keyField="id"
        data={threads}
        isLoading={isLoading}
        columns={[
          { header: 'Thread', accessor: 'thread' },
          {
            header: 'Participants',
            accessor: (thread) => thread.participants.join(', '),
          },
          { header: 'Last Update', accessor: 'updatedAt' },
          { header: 'Latest Message', accessor: 'lastMessage' },
          {
            header: 'Status',
            accessor: (thread) => <StatusBadge status={thread.status} size="sm" />,
          },
        ]}
        className="rounded-xl border border-slate-800 bg-slate-900/60"
      />
    </div>
  );
}
