import type { WorkOrder } from "@/types/cmms";

interface WorkOrderDetailsModalProps {
  wo: WorkOrder;
  onClose: () => void;
}

const fieldClass = "text-sm text-slate-300";

export default function WorkOrderDetailsModal({ wo, onClose }: WorkOrderDetailsModalProps) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="w-full max-w-lg space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Work Order Details</h2>
            <p className="text-sm text-slate-300">Created {new Date(wo.createdAt).toLocaleString()}</p>
          </div>
          <button
            type="button"
            className="rounded bg-slate-800 px-2 py-1 text-sm font-medium hover:bg-slate-700"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <dt className="text-xs uppercase tracking-wide text-slate-400">Title</dt>
            <dd className={fieldClass}>{wo.title}</dd>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <dt className="text-xs uppercase tracking-wide text-slate-400">Asset</dt>
            <dd className={fieldClass}>{wo.asset ?? '—'}</dd>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <dt className="text-xs uppercase tracking-wide text-slate-400">Priority</dt>
            <dd className={fieldClass}>{wo.priority}</dd>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <dt className="text-xs uppercase tracking-wide text-slate-400">Status</dt>
            <dd className={fieldClass}>{wo.status}</dd>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <dt className="text-xs uppercase tracking-wide text-slate-400">Due Date</dt>
            <dd className={fieldClass}>{wo.dueDate ? new Date(wo.dueDate).toLocaleDateString() : '—'}</dd>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <dt className="text-xs uppercase tracking-wide text-slate-400">Assignee</dt>
            <dd className={fieldClass}>{wo.assignee ?? '—'}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
