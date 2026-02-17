/*
 * SPDX-License-Identifier: MIT
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { AlertCircle, CheckCircle2, Eye, FileText, Pencil, RefreshCcw } from "lucide-react";
import { useSearchParams } from "react-router-dom";

import Card from "@/components/common/Card";
import Badge from "@/components/common/Badge";
import Button from "@/components/common/Button";
import http from "@/lib/http";
import type { Permit } from "@/types";

type PermitStatus = Permit["status"];

type PermitRow = {
  id: string;
  number: string;
  type: string;
  status: PermitStatus;
  riskLevel: string | null;
  validTo: string | null;
  updatedAt: string | null;
};

const STATUS_FILTERS: { value: PermitStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "active", label: "Active" },
  { value: "closed", label: "Closed" },
  { value: "escalated", label: "Escalated" },
  { value: "rejected", label: "Rejected" },
  { value: "draft", label: "Draft" },
];

const isPermitStatus = (value: string | null): value is PermitStatus => {
  return (
    value === "draft" ||
    value === "pending" ||
    value === "approved" ||
    value === "active" ||
    value === "rejected" ||
    value === "closed" ||
    value === "escalated"
  );
};

const formatDate = (value: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return format(date, "MMM d, yyyy");
};

const normalizePermit = (permit: Permit): PermitRow | null => {
  const id = permit.id ?? permit._id ?? permit.permitNumber;
  if (!id) return null;
  return {
    id,
    number: permit.permitNumber,
    type: permit.type,
    status: (permit.status ?? "pending") as PermitStatus,
    riskLevel: permit.riskLevel ?? null,
    validTo: permit.validTo ?? null,
    updatedAt: permit.updatedAt ?? permit.createdAt ?? null,
  };
};

const PRECONFIGURED_PERMITS = [
  {
    id: "hot-work",
    name: "Hot Work Permit",
    description: "Manage welding, cutting, or any activity involving open flames and sparks.",
  },
  {
    id: "aerial-platform",
    name: "Aerial Platform Permit",
    description: "Ensure safe operation of scissor lifts, boom lifts, and elevated work platforms.",
  },
  {
    id: "crane-usage",
    name: "Crane Usage Permit",
    description: "Coordinate crane lifts, rigging plans, and ground crew communication checks.",
  },
];

export default function PermitsPage() {
  const [permits, setPermits] = useState<PermitRow[]>([]);
  const [permitDetails, setPermitDetails] = useState<Permit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedPermitId, setSelectedPermitId] = useState<string | null>(null);
  type BuilderState = {
    permitNumber: string;
    type: string;
    riskLevel?: Permit['riskLevel'];
    approvals: string[];
    isolationSteps: string[];
    watchers: string;
    description: string;
  };

  const [builder, setBuilder] = useState<BuilderState>({
    permitNumber: '',
    type: 'Hot work',
    riskLevel: 'medium',
    approvals: ['Supervisor'],
    isolationSteps: ['Lockout energy source', 'Test for zero energy'],
    watchers: '',
    description: '',
  });
  const [lockoutNote, setLockoutNote] = useState('');

  const [statusFilter, setStatusFilter] = useState<PermitStatus | "all">(() => {
    const param = searchParams.get("status");
    if (isPermitStatus(param)) {
      return param;
    }
    return "all";
  });

  useEffect(() => {
    const param = searchParams.get("status");
    if (param === null) {
      setStatusFilter((prev) => (prev === "all" ? prev : "all"));
      return;
    }
    if (isPermitStatus(param) && param !== statusFilter) {
      setStatusFilter(param);
    }
  }, [searchParams, statusFilter]);

  const fetchPermits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await http.get<Permit[]>("/permits");
      const normalized = Array.isArray(data)
        ? data.flatMap((item) => {
            const mapped = normalizePermit(item);
            return mapped ? [mapped] : [];
          })
        : [];
      setPermits(normalized);
      setPermitDetails(data ?? []);
      if (!selectedPermitId && data?.length) {
        const firstId = data[0].id ?? data[0]._id ?? data[0].permitNumber;
        setSelectedPermitId(firstId ?? null);
      }
    } catch (err) {
      console.error("Failed to load permits", err);
      setError("Unable to load permits. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, [selectedPermitId]);

  useEffect(() => {
    void fetchPermits();
  }, [fetchPermits]);

  const filteredPermits = useMemo(() => {
    if (statusFilter === "all") {
      return permits;
    }
    return permits.filter((permit) => permit.status === statusFilter);
  }, [permits, statusFilter]);

  const summary = useMemo(() => {
    const pending = permits.filter((permit) => permit.status === "pending").length;
    const active = permits.filter((permit) => permit.status === "active").length;
    const closed = permits.filter((permit) => permit.status === "closed").length;
    const escalated = permits.filter((permit) => permit.status === "escalated").length;
    return { total: permits.length, pending, active, closed, escalated };
  }, [permits]);

  const upsertPermit = (updated: Permit) => {
    const id = updated.id ?? updated._id ?? updated.permitNumber;
    if (!id) return;
    setPermitDetails((prev) => {
      const existing = prev.findIndex((p) => (p.id ?? p._id ?? p.permitNumber) === id);
      if (existing === -1) return [updated, ...prev];
      const next = [...prev];
      next[existing] = updated;
      return next;
    });
    setPermits((prev) => {
      const normalized = normalizePermit(updated);
      if (!normalized) return prev;
      const existing = prev.findIndex((p) => p.id === normalized.id);
      if (existing === -1) return [normalized, ...prev];
      const next = [...prev];
      next[existing] = { ...next[existing], ...normalized };
      return next;
    });
  };

  const selectedPermit = useMemo(() => {
    const fallback = permitDetails[0];
    return (
      permitDetails.find((permit) => (permit.id ?? permit._id ?? permit.permitNumber) === selectedPermitId) ?? fallback
    );
  }, [permitDetails, selectedPermitId]);

  const createPermitWorkflow = async () => {
    const approvals = builder.approvals.filter(Boolean).map((role, index) => ({
      sequence: index,
      role,
      status: "pending" as const,
    }));
    const isolationSteps = builder.isolationSteps
      .map((description, index) => ({ description, completed: false, completedAt: undefined, index }))
      .filter((step) => step.description);
    const watchers = builder.watchers
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const payload = {
      permitNumber: builder.permitNumber || `PTW-${Date.now()}`,
      type: builder.type,
      riskLevel: builder.riskLevel,
      description: builder.description,
      approvalChain: approvals,
      isolationSteps,
      watchers,
      status: "pending" as const,
    } satisfies Partial<Permit>;

    const response = await http.post<Permit>("/permits", payload);
    if (response.data) {
      upsertPermit(response.data);
      setSelectedPermitId(response.data.id ?? response.data._id ?? response.data.permitNumber);
    }
  };

  const completeLockoutStep = async (index: number) => {
    if (!selectedPermit || selectedPermit.isolationSteps?.[index] == null) return;
    const { data } = await http.post<Permit>(`/permits/${selectedPermit.id ?? selectedPermit._id ?? selectedPermit.permitNumber}/lockout`, {
      index,
      completed: true,
      verificationNotes: lockoutNote || undefined,
    });
    if (data) {
      upsertPermit(data);
      setLockoutNote("");
    }
  };

  const actOnApproval = async (sequence: number, status: "approved" | "rejected") => {
    if (!selectedPermit) return;
    const { data } = await http.post<Permit>(
      `/permits/${selectedPermit.id ?? selectedPermit._id ?? selectedPermit.permitNumber}/approvals`,
      {
        sequence,
        status,
      },
    );
    if (data) {
      upsertPermit(data);
    }
  };

  const handleFilterChange = (value: PermitStatus | "all") => {
    setStatusFilter(value);
    const next = new URLSearchParams(searchParams);
    if (value === "all") {
      next.delete("status");
    } else {
      next.set("status", value);
    }
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">Permits</h1>
          <p className="text-sm text-[var(--wp-color-text-muted)] dark:text-[var(--wp-color-text-muted)]">
            Monitor pending approvals, active work permits, and isolation readiness.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              void fetchPermits();
            }}
            className="inline-flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Permit-to-work builder" subtitle="Strictly typed inputs for new permits and approvals">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">
              Permit number
              <input
                className="mt-1 w-full rounded border border-[var(--wp-color-border)] p-2 dark:border-[var(--wp-color-border)]"
                value={builder.permitNumber}
                onChange={(e) => setBuilder((prev) => ({ ...prev, permitNumber: e.target.value }))}
                placeholder="PTW-001"
              />
            </label>
            <label className="text-sm text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">
              Type
              <input
                className="mt-1 w-full rounded border border-[var(--wp-color-border)] p-2 dark:border-[var(--wp-color-border)]"
                value={builder.type}
                onChange={(e) => setBuilder((prev) => ({ ...prev, type: e.target.value }))}
                placeholder="Hot work"
              />
            </label>
            <label className="text-sm text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">
              Risk level
              <select
                  className="mt-1 w-full rounded border border-[var(--wp-color-border)] p-2 dark:border-[var(--wp-color-border)]"
                  value={builder.riskLevel}
                  onChange={(e) => setBuilder((prev) => ({ ...prev, riskLevel: e.target.value as Permit['riskLevel'] }))}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
            </label>
            <label className="text-sm text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">
              Watchers (comma separated)
              <input
                className="mt-1 w-full rounded border border-[var(--wp-color-border)] p-2 dark:border-[var(--wp-color-border)]"
                value={builder.watchers}
                onChange={(e) => setBuilder((prev) => ({ ...prev, watchers: e.target.value }))}
                placeholder="ops@example.com"
              />
            </label>
          </div>
          <label className="mt-3 block text-sm text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">
            Description
            <textarea
              className="mt-1 w-full rounded border border-[var(--wp-color-border)] p-2 dark:border-[var(--wp-color-border)]"
              value={builder.description}
              onChange={(e) => setBuilder((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Scope, hazards, and mitigating controls"
            />
          </label>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">
              Approval roles (one per line)
              <textarea
                className="mt-1 w-full rounded border border-[var(--wp-color-border)] p-2 dark:border-[var(--wp-color-border)]"
                value={builder.approvals.join("\n")}
                onChange={(e) => setBuilder((prev) => ({ ...prev, approvals: e.target.value.split("\n").filter(Boolean) }))}
              />
            </label>
            <label className="text-sm text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">
              Isolation steps
              <textarea
                className="mt-1 w-full rounded border border-[var(--wp-color-border)] p-2 dark:border-[var(--wp-color-border)]"
                value={builder.isolationSteps.join("\n")}
                onChange={(e) =>
                  setBuilder((prev) => ({ ...prev, isolationSteps: e.target.value.split("\n").filter(Boolean) }))
                }
              />
            </label>
          </div>
          <div className="mt-4">
            <Button type="button" onClick={() => void createPermitWorkflow()} className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Create permit
            </Button>
          </div>
        </Card>

        <Card title="Lockout / Tagout" subtitle="Track isolation, verification, and approvals">
          {selectedPermit ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--wp-color-text-muted)] dark:text-[var(--wp-color-text-muted)]">Permit</p>
                  <p className="font-semibold text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">
                    {selectedPermit.permitNumber} · {selectedPermit.type}
                  </p>
                </div>
                <select
                  className="rounded border border-[var(--wp-color-border)] p-2 text-sm dark:border-[var(--wp-color-border)]"
                  value={selectedPermitId ?? ''}
                  onChange={(e) => setSelectedPermitId(e.target.value || null)}
                >
                  {permitDetails.map((permit) => {
                    const id = permit.id ?? permit._id ?? permit.permitNumber;
                    return (
                      <option key={id} value={id ?? ''}>
                        {permit.permitNumber}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <p className="text-sm font-medium text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">Approval chain</p>
                <ul className="mt-2 space-y-2">
                  {(selectedPermit.approvalChain ?? []).map((step) => (
                    <li key={step.sequence} className="flex items-center justify-between rounded border border-[var(--wp-color-border)] p-2 text-sm dark:border-[var(--wp-color-border)]">
                      <span>
                        {step.role} · {step.status}
                      </span>
                      {step.status === "pending" ? (
                        <div className="space-x-2">
                          <Button size="xs" onClick={() => void actOnApproval(step.sequence, "approved")}>Approve</Button>
                          <Button size="xs" variant="secondary" onClick={() => void actOnApproval(step.sequence, "rejected")}>
                            Reject
                          </Button>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-sm font-medium text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">Isolation steps</p>
                <ul className="mt-2 space-y-2">
                  {(selectedPermit.isolationSteps ?? []).map((step, index) => (
                    <li key={index} className="flex items-center justify-between rounded border border-[var(--wp-color-border)] p-2 text-sm dark:border-[var(--wp-color-border)]">
                      <div>
                        <p className="font-medium text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">{step.description}</p>
                        {step.verificationNotes ? (
                          <p className="text-xs text-[var(--wp-color-text-muted)]">Note: {step.verificationNotes}</p>
                        ) : null}
                      </div>
                      {step.completed ? (
                        <span className="text-emerald-600">Completed</span>
                      ) : (
                        <Button size="xs" onClick={() => void completeLockoutStep(index)}>
                          Mark complete
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
                <label className="mt-2 block text-sm text-[var(--wp-color-text)] dark:text-[var(--wp-color-text-muted)]">
                  Verification notes
                  <input
                    className="mt-1 w-full rounded border border-[var(--wp-color-border)] p-2 text-sm dark:border-[var(--wp-color-border)]"
                    value={lockoutNote}
                    onChange={(e) => setLockoutNote(e.target.value)}
                    placeholder="Lock-out device applied and tested"
                  />
                </label>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--wp-color-text-muted)]">Create a permit to see the lockout workflow.</p>
          )}
        </Card>
      </div>

      <Card
        title="Pre-created permits"
        subtitle="Quickly launch or review commonly used permit templates"
      >
        <div className="space-y-4">
          {PRECONFIGURED_PERMITS.map((preset) => (
            <div
              key={preset.id}
              className="flex flex-col gap-3 rounded-lg border border-[var(--wp-color-border)] p-4 dark:border-[var(--wp-color-border)] sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-base font-medium text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">
                  {preset.name}
                </p>
                <p className="mt-1 text-sm text-[var(--wp-color-text-muted)] dark:text-[var(--wp-color-text-muted)]">
                  {preset.description}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" className="inline-flex items-center gap-2">
                  <FileText aria-hidden className="h-4 w-4" />
                  Apply for permit
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="inline-flex items-center gap-2"
                >
                  <Pencil aria-hidden className="h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="inline-flex items-center gap-2"
                >
                  <Eye aria-hidden className="h-4 w-4" />
                  View
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="bg-gradient-to-br from-indigo-600 to-purple-600 text-[var(--wp-color-text)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--wp-color-text)]/70">Total permits</p>
              <p className="mt-2 text-3xl font-semibold">{summary.total}</p>
            </div>
            <CheckCircle2 className="h-10 w-10 text-[var(--wp-color-text)]/70" />
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-[var(--wp-color-text)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--wp-color-text)]/70">Pending approvals</p>
              <p className="mt-2 text-3xl font-semibold">{summary.pending}</p>
            </div>
            <AlertCircle className="h-10 w-10 text-[var(--wp-color-text)]/70" />
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-[var(--wp-color-text)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--wp-color-text)]/70">Active permits</p>
              <p className="mt-2 text-3xl font-semibold">{summary.active}</p>
            </div>
            <CheckCircle2 className="h-10 w-10 text-[var(--wp-color-text)]/70" />
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-rose-500 to-pink-600 text-[var(--wp-color-text)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--wp-color-text)]/70">Escalated</p>
              <p className="mt-2 text-3xl font-semibold">{summary.escalated}</p>
            </div>
            <AlertCircle className="h-10 w-10 text-[var(--wp-color-text)]/70" />
          </div>
        </Card>
      </section>

      <Card
        title="Permit registry"
        subtitle="Status of work permits and associated timelines"
        headerActions={
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]" htmlFor="permit-status-filter">
              Status
            </label>
            <select
              id="permit-status-filter"
              className="rounded-lg border border-[var(--wp-color-border)] px-3 py-1.5 text-sm text-[var(--wp-color-text)] focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-[var(--wp-color-border)] dark:bg-[var(--wp-color-surface)] dark:text-[var(--wp-color-text)]"
              value={statusFilter}
              onChange={(event) => handleFilterChange(event.target.value as PermitStatus | "all")}
              disabled={loading}
            >
              {STATUS_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        }
      >
        {error ? (
          <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200 text-sm">
            <thead className="bg-shadow-50 text-left text-xs font-semibold uppercase tracking-wide text-[var(--wp-color-text-muted)]">
              <tr>
                <th className="px-4 py-3">Permit #</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Risk level</th>
                <th className="px-4 py-3">Valid through</th>
                <th className="px-4 py-3">Last updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {loading ? (
                <tr>
                  <td className="px-4 py-6" colSpan={6}>
                    <div className="flex animate-pulse flex-col gap-3">
                      <div className="h-3 rounded-full bg-[color-mix(in srgb,var(--wp-color-text) 12%, transparent)]" />
                      <div className="h-3 rounded-full bg-[color-mix(in srgb,var(--wp-color-text) 12%, transparent)]" />
                      <div className="h-3 rounded-full bg-[color-mix(in srgb,var(--wp-color-text) 12%, transparent)]" />
                    </div>
                  </td>
                </tr>
              ) : filteredPermits.length ? (
                filteredPermits.map((permit) => (
                  <tr key={permit.id} className="hover:bg-[var(--wp-color-surface)]">
                    <td className="px-4 py-3 font-medium text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">{permit.number}</td>
                    <td className="px-4 py-3 text-[var(--wp-color-text-muted)] dark:text-[var(--wp-color-text-muted)]">{permit.type}</td>
                    <td className="px-4 py-3">
                      <Badge text={permit.status} type="status" size="sm" />
                    </td>
                    <td className="px-4 py-3 text-[var(--wp-color-text-muted)] dark:text-[var(--wp-color-text-muted)]">
                      {permit.riskLevel ? permit.riskLevel : "—"}
                    </td>
                    <td className="px-4 py-3 text-[var(--wp-color-text-muted)] dark:text-[var(--wp-color-text-muted)]">{formatDate(permit.validTo)}</td>
                    <td className="px-4 py-3 text-[var(--wp-color-text-muted)] dark:text-[var(--wp-color-text-muted)]">{formatDate(permit.updatedAt)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-center text-[var(--wp-color-text-muted)]" colSpan={6}>
                    No permits match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}


