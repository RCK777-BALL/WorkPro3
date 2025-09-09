import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
 import { deleteDepartment, listDepartments } from "../api/departments";
 

type Department = { _id: string; name: string; description?: string };

export default function Departments() {
  const [items, setItems] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
 

  const load = () => {
    setLoading(true);
    listDepartments()
      .then(setItems)
      .catch((e) =>
        setError(
          e instanceof Error ? e.message : "Failed to load departments",
        ),
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this department?")) return;
    await deleteDepartment(id);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Departments</h1>
        <button
          type="button"
          onClick={() => navigate("/departments/new")}
          className="rounded bg-neutral-900 text-white px-3 py-1 text-sm dark:bg-white dark:text-neutral-900"
        >
          Add Department
        </button>
      </div>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-600 text-sm">{error}</div>}
      {!loading && !error && (
        <ul className="divide-y divide-neutral-200 dark:divide-neutral-800 border rounded">
          {items.length === 0 && <li className="p-3 text-sm text-neutral-500">No departments</li>}
          {items.map((d) => (
            <li key={d._id} className="p-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{d.name}</div>
                {d.description && <div className="text-xs text-neutral-500">{d.description}</div>}
              </div>
              <div className="space-x-2">
                <button
                   onClick={() => navigate(`/departments/${d._id}/edit`)}
                  className="rounded border px-2 py-1 text-sm"
 
                >
                  Edit
                </button>
                <button
                   onClick={() => handleDelete(d._id)}
                  className="rounded border px-2 py-1 text-sm"
   
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
