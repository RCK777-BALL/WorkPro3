import { useEffect, useState } from 'react';

type OfflineAction = {
  _id: string;
  type: string;
  status: string;
  attempts?: number;
  lastError?: string;
};

export function OfflineQueuePanel() {
  const [actions, setActions] = useState<OfflineAction[]>([]);

  useEffect(() => {
    void fetch('/api/mobile/admin/sync/pending')
      .then((res) => res.json())
      .then((json) => setActions(json.data ?? []))
      .catch(() => setActions([]));
  }, []);

  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold">Offline queue</h2>
      <p className="text-sm text-muted">Pending and failed actions reported by devices.</p>
      <div className="mt-3 space-y-2">
        {actions.map((action) => (
          <div key={action._id} className="rounded border border-slate-200 p-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">{action.type}</span>
              <span className="text-xs uppercase text-slate-500">{action.status}</span>
            </div>
            <div className="text-xs text-slate-600">Attempts: {action.attempts ?? 0}</div>
            {action.lastError && <div className="text-xs text-amber-700">Last error: {action.lastError}</div>}
          </div>
        ))}
        {actions.length === 0 && <div className="text-sm text-slate-500">Queue is clear.</div>}
      </div>
    </section>
  );
}

export default OfflineQueuePanel;
