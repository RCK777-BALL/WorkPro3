/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

import type { WorkRequestItem, WorkRequestStatus } from '@/api/workRequests';
import { convertWorkRequest, fetchWorkRequests, updateWorkRequestStatus } from '@/api/workRequests';

const statusOptions: WorkRequestStatus[] = ['new', 'reviewing', 'converted', 'closed'];

export default function RequestTriage() {
  const [requests, setRequests] = useState<WorkRequestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchWorkRequests();
        setRequests(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load requests.';
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const updateStatus = async (requestId: string, status: WorkRequestStatus) => {
    setUpdating(requestId);
    try {
      await updateWorkRequestStatus(requestId, status);
      toast.success('Status updated');
      setRequests((prev) => prev.map((req) => (req._id === requestId ? { ...req, status } : req)));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to update status.';
      toast.error(message);
    } finally {
      setUpdating(null);
    }
  };

  const convert = async (requestId: string) => {
    setUpdating(requestId);
    try {
      const result = await convertWorkRequest(requestId);
      toast.success(`Work order ${result.workOrderId} created`);
      setRequests((prev) =>
        prev.map((req) => (req._id === requestId ? { ...req, status: 'converted', workOrder: result.workOrderId } : req)),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to convert request.';
      toast.error(message);
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold text-neutral-900">Request triage</h1>
        <p className="text-sm text-neutral-500">Review incoming submissions, update status, and convert to work orders.</p>
      </header>

      {loading ? (
        <p className="text-sm text-neutral-500">Loading…</p>
      ) : (
        <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-4">
          {requests.map((request) => (
            <div key={request._id} className="flex flex-col gap-3 rounded-xl border border-neutral-100 p-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-neutral-900">{request.title}</p>
                <p className="text-xs text-neutral-500">{request.requesterName}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={request.status}
                  onChange={(evt) => updateStatus(request._id, evt.target.value as WorkRequestStatus)}
                  className="rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                  disabled={updating === request._id}
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => convert(request._id)}
                  className="rounded-full bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                  disabled={updating === request._id || request.status === 'converted'}
                >
                  {updating === request._id ? 'Working…' : request.workOrder ? 'Converted' : 'Convert to WO'}
                </button>
              </div>
            </div>
          ))}
          {requests.length === 0 && <p className="text-sm text-neutral-500">No requests waiting for triage.</p>}
        </div>
      )}
    </div>
  );
}
