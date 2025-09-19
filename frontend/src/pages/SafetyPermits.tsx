/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useState } from 'react';
import http from '@/lib/http';
import { useAuth } from '@/context/AuthContext';
import type {
  Permit,
  PermitHistoryEntry,
  PermitApprovalStep,
  SafetyKpiResponse,
  PermitActivitySummary,
} from '@/types';
import Button from '@/components/common/Button';

const PERMIT_TYPES = ['hot-work', 'confined-space', 'lockout-tagout', 'general'];

function normalizePermit(raw: Permit): Permit {
  const id = raw._id ?? raw.id ?? '';
  return { ...raw, id };
}

const defaultApprovalChain: Omit<PermitApprovalStep, 'status'>[] = [
  { role: 'supervisor' },
  { role: 'manager' },
];

export default function SafetyPermits() {
  const { user } = useAuth();
  const [permits, setPermits] = useState<Permit[]>([]);
  const [selectedPermit, setSelectedPermit] = useState<Permit | null>(null);
  const [history, setHistory] = useState<PermitHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [kpis, setKpis] = useState<SafetyKpiResponse | null>(null);
  const [activity, setActivity] = useState<PermitActivitySummary | null>(null);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [form, setForm] = useState({
    type: PERMIT_TYPES[0],
    description: '',
    isolation: '',
    watchers: '',
  });
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canApprove = useMemo(() => {
    if (!user || !selectedPermit) return false;
    const activeStep = selectedPermit.approvalChain.find((step) => step.status === 'pending');
    if (!activeStep) return false;
    if (activeStep.user && activeStep.user === user.id) return true;
    if (activeStep.role && user.role && activeStep.role === user.role) return true;
    return false;
  }, [user, selectedPermit]);

  const fetchPermits = async (): Promise<Permit[]> => {
    try {
      const res = await http.get<Permit[]>('/permits');
      const normalized = res.data.map(normalizePermit);
      setPermits(normalized);
      if (selectedPermit) {
        const updated = normalized.find((item) => (item.id ?? item._id) === (selectedPermit.id ?? selectedPermit._id));
        if (updated) setSelectedPermit(updated);
      }
      return normalized;
    } catch (err) {
      console.error('Failed to load permits', err);
      setError('Failed to load permits');
      return [] as Permit[];
    }
  };

  const fetchKpis = async () => {
    try {
      const res = await http.get<SafetyKpiResponse>('/permits/kpis');
      setKpis(res.data);
    } catch (err) {
      console.error('Failed to load safety KPIs', err);
    }
  };

  const fetchActivity = async (userId: string) => {
    try {
      const res = await http.get<PermitActivitySummary>('/permits/activity', {
        params: { userId },
      });
      setActivity(res.data);
      setActivityError(null);
    } catch (err) {
      console.error('Failed to load permit activity', err);
      setActivityError('Unable to load permit activity');
    }
  };

  useEffect(() => {
    fetchPermits();
    fetchKpis();
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchActivity(user.id);
    }
  }, [user?.id]);

  const openHistory = async (permit: Permit) => {
    setSelectedPermit(permit);
    setHistory([]);
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await http.get<PermitHistoryEntry[]>(`/permits/${permit.id ?? permit._id}/history`);
      setHistory(res.data);
    } catch (err) {
      console.error('Failed to load history', err);
      setHistoryError('Unable to load permit history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const submitPermit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;
    setRequesting(true);
    try {
      const isolationSteps = form.isolation
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((description) => ({ description }));
      const watchers = form.watchers
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
      await http.post('/permits', {
        type: form.type,
        description: form.description,
        requestedBy: user.id,
        approvalChain: defaultApprovalChain,
        isolationSteps,
        watchers,
      });
      setForm({ type: PERMIT_TYPES[0], description: '', isolation: '', watchers: '' });
      fetchPermits();
      fetchKpis();
      if (user.id) fetchActivity(user.id);
    } catch (err) {
      console.error('Failed to create permit', err);
      setError('Failed to request permit');
    } finally {
      setRequesting(false);
    }
  };

  const approve = async (permit: Permit, notes?: string) => {
    try {
      await http.post(`/permits/${permit.id ?? permit._id}/approve`, { notes });
      const updatedList = await fetchPermits();
      fetchKpis();
      if (user?.id) fetchActivity(user.id);
      const refreshed = updatedList.find((item) => (item.id ?? item._id) === (permit.id ?? permit._id));
      if (refreshed) {
        openHistory(refreshed);
      }
    } catch (err) {
      console.error('Failed to approve permit', err);
      setError('Unable to approve permit');
    }
  };

  const reject = async (permit: Permit, notes?: string) => {
    try {
      await http.post(`/permits/${permit.id ?? permit._id}/reject`, { notes });
      fetchPermits();
      fetchKpis();
      if (user?.id) fetchActivity(user.id);
    } catch (err) {
      console.error('Failed to reject permit', err);
      setError('Unable to reject permit');
    }
  };

  const escalate = async (permit: Permit) => {
    try {
      await http.post(`/permits/${permit.id ?? permit._id}/escalate`);
      fetchPermits();
    } catch (err) {
      console.error('Failed to escalate permit', err);
      setError('Unable to escalate permit');
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Safety Permits</h1>
          <p className="text-sm text-neutral-500">
            Request, review, and audit critical permits to keep work safe.
          </p>
        </div>
        {kpis && (
          <div className="flex gap-4">
            <div className="rounded-lg border bg-white px-4 py-2 shadow-sm">
              <p className="text-xs text-neutral-500">Active Permits</p>
              <p className="text-lg font-semibold text-neutral-900">{kpis.activeCount}</p>
            </div>
            <div className="rounded-lg border bg-white px-4 py-2 shadow-sm">
              <p className="text-xs text-neutral-500">Overdue Approvals</p>
              <p className="text-lg font-semibold text-neutral-900">{kpis.overdueApprovals}</p>
            </div>
            <div className="rounded-lg border bg-white px-4 py-2 shadow-sm">
              <p className="text-xs text-neutral-500">Incidents (30d)</p>
              <p className="text-lg font-semibold text-neutral-900">{kpis.incidentsLast30}</p>
            </div>
          </div>
        )}
      </header>

      {error && <div className="rounded border border-error-200 bg-error-50 p-3 text-sm text-error-600">{error}</div>}

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-4">
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-neutral-900">Request new permit</h2>
            <p className="text-sm text-neutral-500">
              Submit a permit request with automatic supervisor and manager approval steps.
            </p>
            <form className="mt-4 space-y-4" onSubmit={submitPermit}>
              <div>
                <label className="block text-sm font-medium text-neutral-700">Permit type</label>
                <select
                  className="mt-1 w-full rounded border border-neutral-300 bg-white p-2"
                  value={form.type}
                  onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
                  required
                >
                  {PERMIT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700">Description</label>
                <textarea
                  className="mt-1 w-full rounded border border-neutral-300 p-2"
                  rows={3}
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="Describe the work and hazards..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700">Isolation steps (one per line)</label>
                <textarea
                  className="mt-1 w-full rounded border border-neutral-300 p-2"
                  rows={3}
                  value={form.isolation}
                  onChange={(event) => setForm((prev) => ({ ...prev, isolation: event.target.value }))}
                  placeholder="Lockout main breaker\nVerify zero energy state"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700">Watchers (user IDs comma separated)</label>
                <input
                  className="mt-1 w-full rounded border border-neutral-300 p-2"
                  value={form.watchers}
                  onChange={(event) => setForm((prev) => ({ ...prev, watchers: event.target.value }))}
                  placeholder="Optional"
                />
              </div>
              <Button type="submit" disabled={requesting}>
                {requesting ? 'Submitting…' : 'Submit permit request'}
              </Button>
            </form>
          </div>

          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-neutral-900">Open permits</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200 text-sm">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-neutral-600">Permit</th>
                    <th className="px-3 py-2 text-left font-medium text-neutral-600">Type</th>
                    <th className="px-3 py-2 text-left font-medium text-neutral-600">Status</th>
                    <th className="px-3 py-2 text-left font-medium text-neutral-600">Next step</th>
                    <th className="px-3 py-2 text-right font-medium text-neutral-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {permits.map((permit) => {
                    const activeStep = permit.approvalChain.find((step) => step.status === 'pending');
                    const canUserApprove = (() => {
                      if (!user) return false;
                      if (activeStep?.user && activeStep.user === user.id) return true;
                      if (activeStep?.role && user.role && activeStep.role === user.role) return true;
                      return false;
                    })();
                    const canUserEscalate = user?.role === 'admin' || user?.role === 'supervisor';
                    return (
                      <tr key={permit.id ?? permit._id}>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => openHistory(permit)}
                            className="font-medium text-primary-600 hover:underline"
                          >
                            {permit.permitNumber || permit.id}
                          </button>
                        </td>
                        <td className="px-3 py-2 capitalize">{permit.type}</td>
                        <td className="px-3 py-2">
                          <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700">
                            {permit.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-neutral-600">
                          {activeStep ? (
                            <div>
                              <div className="font-medium">{activeStep.role}</div>
                              {activeStep.user && <div className="text-xs">Assigned: {activeStep.user}</div>}
                            </div>
                          ) : (
                            <span className="text-xs text-neutral-500">All steps complete</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right space-x-2">
                          {canUserApprove && (
                            <Button size="sm" variant="primary" onClick={() => approve(permit)}>
                              Approve
                            </Button>
                          )}
                          {canUserApprove && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => reject(permit)}
                              className="text-error-600"
                            >
                              Reject
                            </Button>
                          )}
                          {canUserEscalate && permit.status === 'pending' && (
                            <Button size="sm" variant="ghost" onClick={() => escalate(permit)}>
                              Escalate
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!permits.length && (
                <div className="py-8 text-center text-sm text-neutral-500">No permits requested yet.</div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <h3 className="text-lg font-semibold text-neutral-900">My safety activity</h3>
            {activityError && <p className="text-sm text-error-600">{activityError}</p>}
            {!activity && !activityError && <p className="text-sm text-neutral-500">Loading activity…</p>}
            {activity && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3 text-center text-sm">
                  <div className="rounded border bg-neutral-50 p-3">
                    <div className="text-xs text-neutral-500">Total permits</div>
                    <div className="text-lg font-semibold text-neutral-900">{activity.totalInvolved}</div>
                  </div>
                  <div className="rounded border bg-neutral-50 p-3">
                    <div className="text-xs text-neutral-500">Pending approvals</div>
                    <div className="text-lg font-semibold text-neutral-900">{activity.pendingApprovals}</div>
                  </div>
                  <div className="rounded border bg-neutral-50 p-3">
                    <div className="text-xs text-neutral-500">Active permits</div>
                    <div className="text-lg font-semibold text-neutral-900">{activity.activePermits}</div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-neutral-700">Recent history</h4>
                  <ul className="mt-2 space-y-2 text-sm text-neutral-600">
                    {activity.recentHistory.length ? (
                      activity.recentHistory.map((entry) => (
                        <li key={`${entry.permitId}-${entry.at}`} className="rounded border border-neutral-200 p-2">
                          <div className="font-medium text-neutral-900">{entry.permitNumber}</div>
                          <div className="text-xs text-neutral-500">
                            {new Date(entry.at).toLocaleString()} — {entry.action}
                          </div>
                          {entry.notes && <div className="text-xs text-neutral-500">{entry.notes}</div>}
                        </li>
                      ))
                    ) : (
                      <li className="text-xs text-neutral-400">No recent activity</li>
                    )}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {selectedPermit && (
            <div className="rounded-lg border bg-white p-4 shadow-sm">
              <h3 className="text-lg font-semibold text-neutral-900">Permit history</h3>
              <p className="text-sm text-neutral-500">
                {selectedPermit.permitNumber} • {selectedPermit.status}
              </p>
              {historyLoading && <p className="mt-3 text-sm text-neutral-500">Loading history…</p>}
              {historyError && <p className="mt-3 text-sm text-error-600">{historyError}</p>}
              {!historyLoading && !historyError && (
                <ul className="mt-3 space-y-2 text-sm text-neutral-600">
                  {history.length ? (
                    history.map((entry) => (
                      <li key={`${entry.action}-${entry.at}`} className="rounded border border-neutral-200 p-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-neutral-800">{entry.action}</span>
                          <span className="text-xs text-neutral-500">{new Date(entry.at).toLocaleString()}</span>
                        </div>
                        {entry.notes && <div className="text-xs text-neutral-500">{entry.notes}</div>}
                      </li>
                    ))
                  ) : (
                    <li className="text-xs text-neutral-400">No history yet.</li>
                  )}
                </ul>
              )}
              {canApprove && (
                <div className="mt-4 space-x-2">
                  <Button size="sm" onClick={() => approve(selectedPermit)}>Approve current step</Button>
                  <Button size="sm" variant="ghost" onClick={() => reject(selectedPermit)}>
                    Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
