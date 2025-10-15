import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import type { WorkOrder } from "@/types/cmms";
import { useQueryState } from "@/hooks/useQueryState";
import WorkOrderModal from "./WorkOrderModal";

export default function WorkOrdersPage() {
  const [modal, setModal] = useState<{ open: boolean; wo?: WorkOrder }>({ open: false });
  const [data, setData] = useState<{ items: WorkOrder[]; total: number }>({ items: [], total: 0 });
  const [query, setQuery] = useQueryState({ page: 1, pageSize: 10, q: '', status: '' });

  useEffect(() => {
    api
      .get('/workorders', { params: query })
      .then((response) => setData(response.data))
      .catch(() => toast.error('Failed to load work orders'));
  }, [query]);

  const refresh = () => {
    api
      .get('/workorders', { params: query })
      .then((response) => setData(response.data))
      .catch(() => toast.error('Failed to load work orders'));
  };

  const totalPages = Math.max(1, Math.ceil(data.total / query.pageSize));

  return (
    <div className="p-6 text-white space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Work Orders</h1>
        <button
          type="button"
          className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium hover:bg-blue-700"
          onClick={() => setModal({ open: true })}
        >
          Create Work Order
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          className="rounded-md bg-slate-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Search…"
          value={query.q}
          onChange={(event) => setQuery({ q: event.target.value, page: 1 })}
        />
        <select
          className="rounded-md bg-slate-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          value={query.status}
          onChange={(event) => setQuery({ status: event.target.value || undefined, page: 1 })}
        >
          <option value="">All statuses</option>
          {['Open', 'In Progress', 'On Hold', 'Completed', 'Cancelled'].map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/60">
            <tr className="text-left [&>th]:px-3 [&>th]:py-3">
              <th>Title</th>
              <th>Asset</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Due</th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody>
            {data.items.map((workOrder) => (
              <tr key={workOrder.id} className="border-t border-slate-800 hover:bg-slate-900/40">
                <td className="px-3 py-2 font-medium">{workOrder.title}</td>
                <td className="px-3 py-2">{workOrder.asset ?? '—'}</td>
                <td className="px-3 py-2">{workOrder.priority}</td>
                <td className="px-3 py-2">{workOrder.status}</td>
                <td className="px-3 py-2">{workOrder.dueDate?.slice(0, 10) ?? '—'}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    className="rounded bg-slate-800 px-2 py-1 text-xs font-medium hover:bg-slate-700"
                    onClick={() => setModal({ open: true, wo: workOrder })}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
            {!data.items.length && (
              <tr>
                <td className="px-3 py-6 text-center text-slate-400" colSpan={6}>
                  No work orders found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3 text-sm">
        <button
          type="button"
          className="rounded bg-slate-800 px-3 py-2 font-medium hover:bg-slate-700 disabled:opacity-40"
          disabled={query.page <= 1}
          onClick={() => setQuery({ page: Math.max(1, (query.page as number) - 1) })}
        >
          Previous
        </button>
        <span className="text-slate-400">
          Page {query.page} of {totalPages}
        </span>
        <button
          type="button"
          className="rounded bg-slate-800 px-3 py-2 font-medium hover:bg-slate-700 disabled:opacity-40"
          disabled={query.page >= totalPages}
          onClick={() => setQuery({ page: (query.page as number) + 1 })}
        >
          Next
        </button>
      </div>

      {modal.open && (
        <WorkOrderModal
          wo={modal.wo}
          onClose={() => setModal({ open: false })}
          onSaved={() => {
            setModal({ open: false });
            refresh();
          }}
        />
      )}
    </div>
  );
}
