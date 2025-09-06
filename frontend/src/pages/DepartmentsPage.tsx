import { useEffect, useState } from "react";
import { fetchDepartments, type Department } from "../api/departments";

export default function DepartmentsPage() {
  const [items, setItems] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fetchDepartments();
        if (mounted) setItems(data);
      } catch (e: any) {
        if (mounted)
          setError(e?.response?.data?.message ?? "Failed to load departments");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = q
    ? items.filter((d) => d.name.toLowerCase().includes(q.toLowerCase()))
    : items;

  if (loading) return <div className="p-4">Loading…</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold">Departments</h1>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search…"
          className="border rounded px-2 py-1"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-sm text-slate-500">No departments</div>
      ) : (
        <ul className="divide-y rounded border">
          {filtered.map((d) => (
            <li key={d._id} className="p-3 flex justify-between">
              <span>{d.name}</span>
              <span className="text-xs text-slate-500">
                {d.lines?.length ?? 0} lines
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
