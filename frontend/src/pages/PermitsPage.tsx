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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

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
    } catch (err) {
      console.error("Failed to load permits", err);
      setError("Unable to load permits. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, []);

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
          <h1 className="text-3xl font-semibold text-neutral-900 dark:text-white">Permits</h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
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

      <Card
        title="Pre-created permits"
        subtitle="Quickly launch or review commonly used permit templates"
      >
        <div className="space-y-4">
          {PRECONFIGURED_PERMITS.map((preset) => (
            <div
              key={preset.id}
              className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-700 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-base font-medium text-neutral-900 dark:text-neutral-100">
                  {preset.name}
                </p>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
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
        <Card className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/70">Total permits</p>
              <p className="mt-2 text-3xl font-semibold">{summary.total}</p>
            </div>
            <CheckCircle2 className="h-10 w-10 text-white/70" />
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/70">Pending approvals</p>
              <p className="mt-2 text-3xl font-semibold">{summary.pending}</p>
            </div>
            <AlertCircle className="h-10 w-10 text-white/70" />
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/70">Active permits</p>
              <p className="mt-2 text-3xl font-semibold">{summary.active}</p>
            </div>
            <CheckCircle2 className="h-10 w-10 text-white/70" />
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-rose-500 to-pink-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/70">Escalated</p>
              <p className="mt-2 text-3xl font-semibold">{summary.escalated}</p>
            </div>
            <AlertCircle className="h-10 w-10 text-white/70" />
          </div>
        </Card>
      </section>

      <Card
        title="Permit registry"
        subtitle="Status of work permits and associated timelines"
        headerActions={
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-200" htmlFor="permit-status-filter">
              Status
            </label>
            <select
              id="permit-status-filter"
              className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
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
            <thead className="bg-shadow-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
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
                      <div className="h-3 rounded-full bg-neutral-200" />
                      <div className="h-3 rounded-full bg-neutral-200" />
                      <div className="h-3 rounded-full bg-neutral-200" />
                    </div>
                  </td>
                </tr>
              ) : filteredPermits.length ? (
                filteredPermits.map((permit) => (
                  <tr key={permit.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">{permit.number}</td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{permit.type}</td>
                    <td className="px-4 py-3">
                      <Badge text={permit.status} type="status" size="sm" />
                    </td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">
                      {permit.riskLevel ? permit.riskLevel : "—"}
                    </td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{formatDate(permit.validTo)}</td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{formatDate(permit.updatedAt)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-center text-neutral-500" colSpan={6}>
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

