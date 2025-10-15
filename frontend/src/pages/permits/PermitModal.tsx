import { useState } from 'react';
import type { Permit } from '@/types/cmms';

interface PermitModalProps {
  permit: Permit;
  onClose: () => void;
  onDecision: (decision: 'Approved' | 'Rejected', notes?: string) => Promise<void>;
}

export default function PermitModal({ permit, onClose, onDecision }: PermitModalProps) {
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState<'Approved' | 'Rejected' | null>(null);

  const handleDecision = async (decision: 'Approved' | 'Rejected') => {
    try {
      setSubmitting(decision);
      await onDecision(decision, notes);
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="w-full max-w-lg space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Review Permit</h2>
          <button
            type="button"
            className="rounded bg-slate-800 px-2 py-1 text-sm font-medium hover:bg-slate-700"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="space-y-2 text-sm text-slate-200">
          <div>
            <span className="text-slate-400">Type:</span> {permit.type}
          </div>
          <div>
            <span className="text-slate-400">Requester:</span> {permit.requester}
          </div>
          <div>
            <span className="text-slate-400">Status:</span> {permit.status}
          </div>
          {permit.attachments?.length ? (
            <div>
              <span className="text-slate-400">Attachments:</span>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {permit.attachments.map((file) => (
                  <li key={file.url}>
                    <a href={file.url} className="text-blue-400 hover:underline" target="_blank" rel="noreferrer">
                      {file.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <textarea
          className="h-28 w-full rounded-lg bg-slate-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Decision notes (optional)"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />

        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="rounded bg-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
            disabled={submitting !== null}
            onClick={() => handleDecision('Rejected')}
          >
            {submitting === 'Rejected' ? 'Rejecting…' : 'Reject'}
          </button>
          <button
            type="button"
            className="rounded bg-green-600 px-4 py-2 text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
            disabled={submitting !== null}
            onClick={() => handleDecision('Approved')}
          >
            {submitting === 'Approved' ? 'Approving…' : 'Approve'}
          </button>
        </div>
      </div>
    </div>
  );
}
