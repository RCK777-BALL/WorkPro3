import { useEffect, useMemo, useState } from 'react';

type Department = {
  _id: string;
  name: string;
  description?: string;
};

export default function DepartmentsPage() {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Department[]>([]);
  const qs = useMemo(() => (q ? `?q=${encodeURIComponent(q)}` : ''), [q]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/departments${qs}`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
        const data = await res.json();
        if (!cancel) setItems(Array.isArray(data) ? data : []);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [qs]);

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-xl font-semibold">Departments</h1>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search…"
          className="border rounded px-3 py-1.5"
        />
      </div>

      {loading ? (
        <div>Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-gray-500">No departments</div>
      ) : (
        <ul className="space-y-2">
          {items.map((d) => (
            <li key={d._id} className="border rounded p-3 bg-white">
              <div className="font-medium">{d.name}</div>
              {d.description && <div className="text-sm text-gray-600">{d.description}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
