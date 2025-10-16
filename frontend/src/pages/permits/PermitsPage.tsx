import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import StatusBadge from "@/components/common/StatusBadge";
import { api } from "@/lib/api";
import type { Permit } from "@/types/cmms";
import { useQueryState } from "@/hooks/useQueryState";
import PermitModal from "./PermitModal";

export default function PermitsPage() {
  const [modal, setModal] = useState<{ open: boolean; permit?: Permit }>({ open: false });
  const [data, setData] = useState<{ items: Permit[]; total: number }>({ items: [], total: 0 });
  const [query, setQuery] = useQueryState({ page: 1, pageSize: 10, q: '', status: '' });

  const loadPermits = () => {
    api
      .get('/permits', { params: query })
      .then((response) => setData(response.data))
      .catch(() => toast.error('Failed to load permits'));
  };

  useEffect(() => {
    loadPermits();
  }, [query]);

  return (
    <div className="space-y-4 p-6 text-white">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Safety Permits</h1>
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
          {['Pending', 'Approved', 'Rejected'].map((status) => (
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
              <th>Type</th>
              <th>Requester</th>
              <th>Status</th>
              <th>Created</th>
              <th className="w-24" />
            </tr>
          </thead>
          <tbody>
            {data.items.map((permit) => (
              <tr key={permit.id} className="border-t border-slate-800 hover:bg-slate-900/40">
                <td className="px-3 py-2 font-medium">{permit.type}</td>
                <td className="px-3 py-2">{permit.requester}</td>
                <td className="px-3 py-2">
                  <StatusBadge status={permit.status} size="sm" />
                </td>
                <td className="px-3 py-2">{permit.createdAt.slice(0, 10)}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    className="rounded bg-slate-800 px-2 py-1 text-xs font-medium hover:bg-slate-700"
                    onClick={() => setModal({ open: true, permit })}
                  >
                    Review
                  </button>
                </td>
              </tr>
            ))}
            {!data.items.length && (
              <tr>
                <td className="px-3 py-6 text-center text-slate-400" colSpan={5}>
                  No permits found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modal.open && modal.permit && (
        <PermitModal
          permit={modal.permit}
          onClose={() => setModal({ open: false })}
          onDecision={async (decision, notes) => {
            await api.post(`/permits/${modal.permit!.id}/decision`, { decision, notes });
            toast.success(`Permit ${decision}`);
            setModal({ open: false });
            loadPermits();
          }}
        />
      )}
    </div>
  );
}
