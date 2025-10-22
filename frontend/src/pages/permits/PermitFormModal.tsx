import { useEffect, useState, type FormEvent } from "react";

import type { Permit } from "@/types/cmms";

const PERMIT_TYPES: Permit["type"][] = ["Hot Work", "Confined Space", "Electrical", "Work at Height"];
const PERMIT_STATUS_OPTIONS: Permit["status"][] = ["Pending", "Approved", "Rejected"];

export type PermitFormValues = {
  type: Permit["type"];
  requester: string;
  status: Permit["status"];
  notes?: string;
};

interface PermitFormModalProps {
  permit?: Permit;
  onClose: () => void;
  onSubmit: (values: PermitFormValues) => Promise<void> | void;
}

const createEmptyForm = (): PermitFormValues => ({
  type: "Hot Work",
  requester: "",
  status: "Pending",
  notes: "",
});

export default function PermitFormModal({ permit, onClose, onSubmit }: PermitFormModalProps) {
  const [form, setForm] = useState<PermitFormValues>(
    permit
      ? {
          type: permit.type,
          requester: permit.requester,
          status: permit.status,
          notes: permit.notes ?? "",
        }
      : createEmptyForm(),
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (permit) {
      setForm({
        type: permit.type,
        requester: permit.requester,
        status: permit.status,
        notes: permit.notes ?? "",
      });
    } else {
      setForm(createEmptyForm());
    }
  }, [permit]);

  const handleChange = <K extends keyof PermitFormValues>(key: K, value: PermitFormValues[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({ ...form, notes: form.notes?.trim() ? form.notes.trim() : undefined });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{permit ? "Edit" : "Add"} Permit</h2>
          <button
            type="button"
            className="rounded bg-slate-800 px-2 py-1 text-sm font-medium hover:bg-slate-700"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="grid gap-4 text-sm text-slate-200">
          <label className="grid gap-1">
            <span className="text-slate-400">Permit type</span>
            <select
              className="rounded-lg bg-slate-800 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              value={form.type}
              onChange={(event) => handleChange("type", event.target.value as Permit["type"])}
              required
            >
              {PERMIT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-slate-400">Requester</span>
            <input
              className="rounded-lg bg-slate-800 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              value={form.requester}
              onChange={(event) => handleChange("requester", event.target.value)}
              placeholder="Who is requesting this permit?"
              required
            />
          </label>

          <label className="grid gap-1">
            <span className="text-slate-400">Status</span>
            <select
              className="rounded-lg bg-slate-800 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              value={form.status}
              onChange={(event) => handleChange("status", event.target.value as Permit["status"])}
              required
            >
              {PERMIT_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-slate-400">Notes (optional)</span>
            <textarea
              className="min-h-[96px] rounded-lg bg-slate-800 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              value={form.notes ?? ""}
              onChange={(event) => handleChange("notes", event.target.value)}
              placeholder="Add any additional context"
            />
          </label>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="rounded bg-slate-800 px-4 py-2 text-sm font-semibold hover:bg-slate-700"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50"
            disabled={submitting}
          >
            {submitting ? (permit ? "Saving…" : "Creating…") : permit ? "Save Changes" : "Create Permit"}
          </button>
        </div>
      </form>
    </div>
  );
}
