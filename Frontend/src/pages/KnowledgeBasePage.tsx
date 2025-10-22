import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import DataTable from '@/components/common/DataTable';
import { api } from '@/lib/api';

interface ArticleRecord {
  id: string;
  title: string;
  category: string;
  owner: string;
  updatedAt: string;
}

const fallbackArticles: ArticleRecord[] = [
  {
    id: 'kb-001',
    title: 'Lockout/Tagout Procedure',
    category: 'Safety',
    owner: 'Safety Team',
    updatedAt: '2024-05-12',
  },
  {
    id: 'kb-002',
    title: 'Boiler Startup Checklist',
    category: 'Operations',
    owner: 'Maintenance',
    updatedAt: '2024-04-28',
  },
  {
    id: 'kb-003',
    title: 'Emergency Response Contacts',
    category: 'Emergency',
    owner: 'Facilities',
    updatedAt: '2024-06-06',
  },
];

const parseArticles = (payload: unknown): ArticleRecord[] => {
  if (Array.isArray(payload)) {
    return payload as ArticleRecord[];
  }
  if (payload && typeof payload === 'object') {
    const source = (payload as { data?: unknown; items?: unknown; records?: unknown }).data ??
      (payload as { data?: unknown; items?: unknown; records?: unknown }).items ??
      (payload as { data?: unknown; items?: unknown; records?: unknown }).records;
    if (Array.isArray(source)) {
      return source as ArticleRecord[];
    }
  }
  return [];
};

export default function KnowledgeBasePage() {
  const [articles, setArticles] = useState<ArticleRecord[]>(fallbackArticles);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    api
      .get('/knowledge-base')
      .then((response) => {
        if (!active) return;
        const nextArticles = parseArticles(response.data);
        if (nextArticles.length) {
          setArticles(nextArticles);
        }
      })
      .catch(() => {
        toast.error('Failed to load knowledge articles');
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
        <h1 className="text-2xl font-semibold mb-2">Knowledge Base</h1>
        <p className="text-sm text-slate-300">
          Centralize SOPs, training documents, and best practices for your maintenance team.
        </p>
      </div>

      <DataTable
        keyField="id"
        data={articles}
        isLoading={isLoading}
        columns={[
          { header: 'Title', accessor: 'title' },
          { header: 'Category', accessor: 'category' },
          { header: 'Owner', accessor: 'owner' },
          { header: 'Updated', accessor: 'updatedAt' },
        ]}
        className="rounded-xl border border-slate-800 bg-slate-900/60"
      />
    </div>
  );
}
