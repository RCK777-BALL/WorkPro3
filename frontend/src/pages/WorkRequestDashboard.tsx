/*
 * SPDX-License-Identifier: MIT
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'react-hot-toast';
import { isAxiosError } from 'axios';

import type { WorkRequestItem, WorkRequestStatus, WorkRequestSummary } from '@/api/workRequests';
import { convertWorkRequest, fetchWorkRequestSummary, fetchWorkRequests } from '@/api/workRequests';
import { useScopeContext } from '@/context/ScopeContext';
import { usePermissions } from '@/auth/usePermissions';

const statusLabels: Record<WorkRequestStatus, string> = {
  new: 'New',
  reviewing: 'Reviewing',
  accepted: 'Accepted',
  converted: 'Converted',
  closed: 'Closed',
  rejected: 'Rejected',
  deleted: 'Deleted',
};

const statusColors: Record<WorkRequestStatus, string> = {
  new: 'bg-blue-600 text-white',
  reviewing: 'bg-amber-500 text-white',
  accepted: 'bg-emerald-600 text-white',
  converted: 'bg-emerald-600 text-white',
  closed: 'bg-slate-600 text-white',
  rejected: 'bg-rose-600 text-white',
  deleted: 'bg-neutral-700 text-white',
};

const priorityColors: Record<WorkRequestItem['priority'], string> = {
  low: 'text-emerald-300',
  medium: 'text-amber-300',
  high: 'text-orange-300',
  critical: 'text-red-300',
};

const SummaryCard = ({ title, value, subtitle }: { title: string; value: number | string; subtitle: string }) => (
  <div className="rounded-xl border border-neutral-800 bg-black/80 p-4 shadow-sm">
    <p className="text-sm text-neutral-300">{title}</p>
    <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    <p className="text-xs text-neutral-400">{subtitle}</p>
  </div>
);

const StatusBadge = ({ status }: { status: WorkRequestStatus }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusColors[status]}`}>
    {statusLabels[status]}
  </span>
);

export default function WorkRequestDashboard() {
  const [requests, setRequests] = useState<WorkRequestItem[]>([]);
  const [summary, setSummary] = useState<WorkRequestSummary | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [refreshing, setRefreshing] = useState(false);
  const [converting, setConverting] = useState<Record<string, boolean>>({});
  const { activeTenant, activePlant, loadingPlants, loadingTenants } = useScopeContext();
  const { can } = usePermissions();

  const canReadRequests = can('workrequests.read');
  const canConvertRequests = can('workrequests.convert');

  const resolveErrorMessage = (err: unknown) => {
    if (isAxiosError(err)) {
      const status = err.response?.status;
      if (status === 403) {
        return 'Access to work requests is restricted for the selected tenant or site.';
      }
      if (status === 401) {
        return 'Your session has expired. Please sign in again.';
      }
    }
    return err instanceof Error ? err.message : 'Unable to load work requests.';
  };

  const loadData = useCallback(async () => {
    setStatusLoading(true);
    setError(undefined);
    try {
      const [summaryData, listData] = await Promise.all([fetchWorkRequestSummary(), fetchWorkRequests()]);
      setSummary(summaryData);
      setRequests(listData.items);
    } catch (err) {
      setError(resolveErrorMessage(err));
    } finally {
      setStatusLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!canReadRequests) {
      setStatusLoading(false);
      setError('You do not have permission to view work requests.');
      return;
    }

    if (loadingTenants || loadingPlants) {
      return;
    }

    if (!activeTenant || !activePlant) {
      setStatusLoading(false);
      setError('Select an active tenant and site to view work requests.');
      return;
    }

    loadData();
  }, [
    activePlant,
    activeTenant,
    canReadRequests,
    loadData,
    loadingPlants,
    loadingTenants,
  ]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleConvert = async (requestId: string) => {
    if (!canConvertRequests) {
      toast.error('You do not have permission to convert work requests.');
      return;
    }
    setConverting((prev) => ({ ...prev, [requestId]: true }));
    try {
      const result = await convertWorkRequest(requestId);
      toast.success('Work order created from request.');
      setRequests((prev) =>
        prev.map((item) => (item._id === requestId ? { ...item, status: 'converted', workOrder: result.workOrderId } : item)),
      );
      loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to convert request.';
      toast.error(message);
    } finally {
      setConverting((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  const openRequests = useMemo(
    () => requests.filter((item) => item.status === 'new' || item.status === 'reviewing' || item.status === 'accepted'),
    [requests],
  );

  return (
    <div className="space-y-6 text-white">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Work Requests</h1>
          <p className="text-sm text-neutral-300">Monitor submissions from the public portal and convert them into work orders.</p>
        </div>
        <button
          type="button"
          className="inline-flex items-center rounded-full border border-neutral-600 px-4 py-2 text-sm font-medium text-neutral-100 transition hover:bg-neutral-800"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      {error && <div className="rounded-lg border border-red-700 bg-red-950/80 p-3 text-sm text-red-200">{error}</div>}

      <section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryCard title="Total" value={summary?.total ?? 0} subtitle="All recorded requests" />
          <SummaryCard title="Open" value={summary?.open ?? 0} subtitle="Awaiting review" />
          <SummaryCard title="Converted" value={summary?.statusCounts.converted ?? 0} subtitle="Promoted to work orders" />
          <SummaryCard title="Closed" value={summary?.statusCounts.closed ?? 0} subtitle="Marked as complete" />
          <SummaryCard title="Rejected" value={summary?.statusCounts.rejected ?? 0} subtitle="Declined during triage" />
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Recent activity</h2>
          <p className="text-sm text-neutral-300">Newest requests appear first. Use convert to promote directly into a work order.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-800 bg-black">
            <thead className="bg-neutral-900">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-neutral-300">
                <th className="px-4 py-3">Requester</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3">Attachments</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800 text-sm">
              {requests.map((request) => (
                <tr key={request._id}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{request.requesterName}</div>
                    <div className="text-xs text-neutral-400">{request.requesterEmail ?? request.requesterPhone ?? '—'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{request.title}</div>
                    <p className="text-xs text-neutral-400">{request.description ?? 'No description provided.'}</p>
                  </td>
                  <td className={`px-4 py-3 font-semibold ${priorityColors[request.priority]}`}>{request.priority}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={request.status} />
                  </td>
                  <td className="px-4 py-3 text-neutral-400">
                    {request.createdAt ? formatDistanceToNow(new Date(request.createdAt), { addSuffix: true }) : '—'}
                  </td>
                  <td className="px-4 py-3 text-neutral-400">
                    {request.photos && request.photos.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {request.photos.map((photo) => (
                          <a
                            key={photo}
                            href={`/static/uploads/${photo}`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-neutral-700 px-2 py-1 text-xs text-neutral-200 hover:border-neutral-500"
                          >
                            View
                          </a>
                        ))}
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {request.workOrder ? (
                      <span className="text-xs text-neutral-400">WO #{request.workOrder}</span>
                    ) : (
                      <button
                        type="button"
                        className="inline-flex items-center rounded-full bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60"
                        onClick={() => handleConvert(request._id)}
                        disabled={!canConvertRequests || converting[request._id] || request.status === 'converted'}
                      >
                        {converting[request._id] ? 'Converting…' : 'Convert'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {statusLoading && (
            <p className="px-4 py-3 text-sm text-neutral-400">Loading work requests…</p>
          )}
          {!statusLoading && requests.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-neutral-400">No requests yet.</p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-neutral-800 bg-black/80 p-4">
        <h3 className="text-lg font-semibold text-white">Open queue</h3>
        <p className="text-sm text-neutral-300">{openRequests.length} request(s) awaiting review.</p>
      </section>
    </div>
  );
}
