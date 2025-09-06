import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Layout from "../components/layout/Layout";
import Button from "../components/common/Button";
import ConfirmDialog from "../components/common/ConfirmDialog";
import DepartmentForm from "../components/departments/DepartmentForm";
import {
  createDepartment,
  deleteDepartment,
  listDepartments,
  updateDepartment,
} from "../api/departments";
import type { Department, DepartmentPayload } from "../api/departments";
import { useToast } from "../context/ToastContext";

/**
 * Departments page implements a searchable, paginated table with support for
 * row selection, bulk deletion and a slide-over form for editing/creating
 * departments. The component uses optimistic updates for create, update and
 * delete actions and includes a few keyboard shortcuts:
 *   - Ctrl+F focuses the search box
 *   - Ctrl+N opens the new department form
 *   - Delete removes the currently selected rows
 */

export default function Departments() {
  const { addToast } = useToast();

  // fetched departments
  const [items, setItems] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);

  // search with debounce
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  // pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // selection and bulk actions
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // slide over form state
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);

  // delete confirmation
  const [confirmOpen, setConfirmOpen] = useState(false);
   const pendingDelete = useRef<string[]>([]);
 

  const searchInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listDepartments();
      setItems(data);
    } catch (err) {
      console.error(err);
      addToast("Failed to load departments", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  // debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const filtered = useMemo(() => {
    const q = debounced.toLowerCase();
    return items.filter((d) => d.name.toLowerCase().includes(q));
  }, [items, debounced]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = pageItems.every((d) => next.has(d._id));
      pageItems.forEach((d) => {
        if (allSelected) next.delete(d._id);
        else next.add(d._id);
      });
      return next;
    });
  };

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (dep: Department) => {
    setEditing(dep);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const handleFormSubmit = async (data: DepartmentPayload) => {
    try {
      if (editing) {
        const updated = await updateDepartment(editing._id, data);
        setItems((prev) =>
          prev.map((d) => (d._id === updated._id ? updated : d))
        );
      } else {
        const created = await createDepartment(data);
        setItems((prev) => [created, ...prev]);
      }
      addToast("Department saved", "success");
      closeForm();
    } catch (err) {
      console.error(err);
      addToast("Failed to save department", "error");
    }
  };

   const requestDelete = (ids: string[]) => {
    pendingDelete.current = ids;
 
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
     const ids = pendingDelete.current;
    setConfirmOpen(false);

    // optimistic update
    const prev = items;
    setItems((cur) => cur.filter((d) => !ids.includes(d._id)));
    setSelected((cur) => {
      const next = new Set(cur);
      ids.forEach((id) => next.delete(id));
      return next;
    });

    try {
      await Promise.all(ids.map((id) => deleteDepartment(id)));
      addToast(
        ids.length > 1 ? "Departments deleted" : "Department deleted",
        "success",
      );
    } catch (err) {
      console.error(err);
      addToast("Delete failed", "error");
      setItems(prev); // revert
      load();
 
    }
  };

  // keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        searchInput.current?.focus();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        openNew();
      }
      if (e.key === "Delete" && selected.size > 0) {
        e.preventDefault();
        requestDelete(Array.from(selected));
      }
      if (e.key === "Escape" && formOpen) {
        e.preventDefault();
        closeForm();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [formOpen, selected.size]);

  return (
    <Layout title="Departments">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <input
              ref={searchInput}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search departments..."
              className="border rounded px-3 py-2 w-full sm:w-64"
            />
            {selected.size > 0 && (
              <Button
                variant="danger"
                onClick={() => requestDelete(Array.from(selected))}
              >
                Delete Selected
              </Button>
            )}
          </div>
          <Button onClick={openNew}>Add Department</Button>
        </div>

        <div className="bg-white dark:bg-neutral-800 rounded shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
            <thead className="bg-neutral-50 dark:bg-neutral-900">
              <tr>
                <th className="px-4 py-2">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={pageItems.length > 0 && pageItems.every((d) => selected.has(d._id))}
                    onChange={toggleAll}
                  />
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium">Name</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Lines</th>
                <th className="px-4 py-2 text-right text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center">
                    Loading...
                  </td>
                </tr>
              ) : pageItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-neutral-500">
                    No departments
                  </td>
                </tr>
              ) : (
                pageItems.map((dep) => (
                  <tr
                    key={dep._id}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-700"
                  >
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        aria-label={`Select ${dep.name}`}
                        checked={selected.has(dep._id)}
                        onChange={() => toggleRow(dep._id)}
                      />
                    </td>
                    <td className="px-4 py-2">{dep.name}</td>
                    <td className="px-4 py-2">{dep.lines?.length ?? 0}</td>
                    <td className="px-4 py-2 text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(dep)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => requestDelete([dep._id])}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* pagination controls */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-neutral-600 dark:text-neutral-400">
            Page {page} of {totalPages}
          </div>
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </div>

        <ConfirmDialog
          open={confirmOpen}
          title="Delete Departments"
          message="Are you sure you want to delete the selected department(s)?"
          onConfirm={handleDelete}
           onCancel={() => setConfirmOpen(false)}
 
        />

        {/* slide-over form */}
        <div
          className={`fixed inset-0 z-40 flex ${
            formOpen ? "" : "pointer-events-none"
          }`}
        >
          <div
            className={`absolute inset-0 bg-black/50 transition-opacity ${
              formOpen ? "opacity-100" : "opacity-0"
            }`}
            onClick={closeForm}
          />
          <div
            className={`ml-auto h-full w-full max-w-md bg-white dark:bg-neutral-800 shadow-xl transform transition-transform ${
              formOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            {formOpen && (
              <div className="p-6 overflow-y-auto h-full">
                <DepartmentForm
                  department={editing || undefined}
                  onSuccess={(dep: Department) => {
                    setItems((prev) => {
                      const idx = prev.findIndex((d) => d._id === dep._id);
                      if (idx === -1) return [dep, ...prev];
                      const copy = [...prev];
                      copy[idx] = dep;
                      return copy;
                    });
                    closeForm();
                  }}
                  onSubmit={handleFormSubmit}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

