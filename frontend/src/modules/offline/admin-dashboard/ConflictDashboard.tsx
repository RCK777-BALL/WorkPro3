import { useEffect, useState } from 'react';

type Conflict = {
  id: string;
  status: string;
  resolution?: string;
  entityType: string;
  entityId?: string;
  deviceId?: string;
};

export function ConflictDashboard() {
  const [conflicts, setConflicts] = useState<Conflict[]>([]);

  useEffect(() => {
    void fetch('/api/mobile/admin/sync/conflicts')
      .then((res) => res.json())
      .then((json) => setConflicts(json.data ?? []))
      .catch(() => setConflicts([]));
  }, []);

  return (
    <section>
      <h2 className="text-lg font-semibold">Conflicts</h2>
      <p className="text-sm text-muted">Recently reported sync conflicts.</p>
      <ul className="mt-3 space-y-2">
        {conflicts.map((conflict) => (
          <li key={conflict.id} className="rounded border border-slate-200 p-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">{conflict.entityType}</span>
              <span className="text-xs uppercase text-slate-500">{conflict.status}</span>
            </div>
            <div className="text-xs text-slate-600">Device: {conflict.deviceId ?? 'n/a'}</div>
            <div className="text-xs text-slate-600">Resolution: {conflict.resolution ?? 'pending'}</div>
            {conflict.entityId && <div className="text-xs text-slate-600">Entity: {conflict.entityId}</div>}
          </li>
        ))}
        {conflicts.length === 0 && <li className="text-sm text-slate-500">No conflicts reported.</li>}
      </ul>
    </section>
  );
}

export default ConflictDashboard;
