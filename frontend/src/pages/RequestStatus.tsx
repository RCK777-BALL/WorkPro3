/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

const statusStyles: Record<string, string> = {
  new: 'bg-amber-100 text-amber-800',
  reviewing: 'bg-blue-100 text-blue-800',
  converted: 'bg-indigo-100 text-indigo-800',
  closed: 'bg-emerald-100 text-emerald-800',
};

const formatDateTime = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

type TechnicianResponse = {
  message: string;
  timestamp?: string;
};

type RequestUpdate = {
  label: string;
  description?: string;
  timestamp?: string;
};

type RequestStatusPayload = {
  token: string;
  status: string;
  title: string;
  description?: string;
  createdAt?: string;
  workOrderId?: string;
  photos?: string[];
  updates?: RequestUpdate[];
  technicianResponses?: TechnicianResponse[];
};

export default function RequestStatus() {
  const { token = '' } = useParams<{ token: string }>();
  const [status, setStatus] = useState<RequestStatusPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!token) return;
    const fetchStatus = async () => {
      setLoading(true);
      setError(undefined);
      try {
        const response = await fetch(`/api/request-portal/status/${encodeURIComponent(token)}`);
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error ?? 'Unable to load request status.');
        }
        setStatus(payload.data ?? payload);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load request status.';
        setError(message);
        setStatus(null);
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, [token]);

  const currentStatusStyle = statusStyles[status?.status ?? ''] ?? 'bg-neutral-100 text-neutral-800';

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
        <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
          <p className="text-lg font-semibold text-neutral-900">A token is required to view a request.</p>
          <p className="mt-3 text-sm text-neutral-500">
            Please use the secure link that was emailed to you after submitting your request.
          </p>
          <Link className="mt-6 inline-flex rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white" to="/public/request">
            Submit or look up another request
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="rounded-3xl bg-white p-6 shadow-lg">
          <p className="text-sm font-semibold text-neutral-500">Request token</p>
          <p className="text-lg font-mono text-neutral-900">{token}</p>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-neutral-900">{status?.title ?? 'Loading status…'}</h1>
              <p className="text-sm text-neutral-500">{status?.description}</p>
            </div>
            <span className={`inline-flex items-center rounded-full px-4 py-1 text-sm font-semibold ${currentStatusStyle}`}>
              {loading ? 'Checking status…' : status?.status ?? 'Unknown'}
            </span>
          </div>
          {status?.workOrderId && (
            <p className="mt-3 text-sm text-neutral-500">Linked work order: {status.workOrderId}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-3 text-sm text-neutral-500">
            <span>Submitted {formatDateTime(status?.createdAt)}</span>
            <Link className="font-semibold text-primary-600 hover:underline" to="/public/request">
              Submit another request
            </Link>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-neutral-900">Latest updates</h2>
            <p className="text-sm text-neutral-500">Milestones we can share about this request.</p>
            <ol className="mt-6 space-y-4">
              {(status?.updates ?? []).length === 0 && !loading && (
                <li className="text-sm text-neutral-500">No updates are available yet.</li>
              )}
              {(status?.updates ?? []).map((update) => (
                <li key={`${update.label}-${update.timestamp ?? ''}`} className="rounded-2xl border border-neutral-200 p-4">
                  <p className="text-sm font-semibold text-neutral-900">{update.label}</p>
                  {update.description && <p className="text-sm text-neutral-500">{update.description}</p>}
                  <p className="mt-2 text-xs text-neutral-400">{formatDateTime(update.timestamp)}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-neutral-900">Technician responses</h2>
            <p className="text-sm text-neutral-500">Shared notes from the technicians assigned to your request.</p>
            <div className="mt-6 space-y-4">
              {(status?.technicianResponses ?? []).length === 0 && !loading && (
                <p className="text-sm text-neutral-500">Technicians have not left public responses yet.</p>
              )}
              {(status?.technicianResponses ?? []).map((response, index) => (
                <article key={`${response.timestamp ?? index}-${response.message.slice(0, 16)}`} className="rounded-2xl border border-neutral-200 p-4">
                  <p className="text-sm text-neutral-900">{response.message}</p>
                  <p className="mt-2 text-xs text-neutral-400">{formatDateTime(response.timestamp)}</p>
                </article>
              ))}
            </div>
          </section>
        </div>

        {status?.photos && status.photos.length > 0 && (
          <section className="rounded-3xl bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-neutral-900">Submitted photos</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {status.photos.map((photo) => (
                <a
                  key={photo}
                  href={`/static/uploads/${photo}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex rounded-2xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 hover:border-neutral-300"
                >
                  View attachment
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
