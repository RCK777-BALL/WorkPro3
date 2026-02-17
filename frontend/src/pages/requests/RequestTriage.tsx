/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Filter,
  Inbox,
  Search,
  X,
} from "lucide-react";
import { toast } from "react-hot-toast";

import type { WorkRequestDecisionStatus, WorkRequestItem, WorkRequestStatus } from "@/api/workRequests";
import {
  convertWorkRequest,
  fetchWorkRequests,
  updateWorkRequestStatus,
} from "@/api/workRequests";
import { EntityAuditList } from "@/features/audit";
import { getNotificationsSocket } from "@/utils/notificationsSocket";

const statusFilters: Array<{
  value: WorkRequestStatus | "all";
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "reviewing", label: "Reviewing" },
  { value: "accepted", label: "Accepted" },
  { value: "converted", label: "Converted" },
  { value: "rejected", label: "Rejected" },
  { value: "closed", label: "Closed" },
];

const priorityFilters: Array<{
  value: WorkRequestItem["priority"] | "all";
  label: string;
}> = [
  { value: "all", label: "All priorities" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const statusBadges: Record<WorkRequestStatus, string> = {
  new: "bg-blue-100 text-blue-800",
  reviewing: "bg-amber-100 text-amber-800",
  accepted: "bg-emerald-100 text-emerald-800",
  converted: "bg-emerald-100 text-emerald-800",
  closed: "bg-[color-mix(in srgb,var(--wp-color-text) 12%, transparent)] text-[var(--wp-color-text)]",
  rejected: "bg-rose-100 text-rose-800",
  deleted: "bg-[color-mix(in srgb,var(--wp-color-text) 12%, transparent)] text-[var(--wp-color-text-muted)]",
};

const priorityAccent: Record<WorkRequestItem["priority"], string> = {
  low: "text-emerald-600",
  medium: "text-amber-600",
  high: "text-orange-600",
  critical: "text-red-600",
};

interface FilterState {
  status: WorkRequestStatus | "all";
  priority: WorkRequestItem["priority"] | "all";
  asset: string;
  location: string;
  tag: string;
  search: string;
}

const defaultFilters: FilterState = {
  status: "all",
  priority: "all",
  asset: "",
  location: "",
  tag: "",
  search: "",
};

export default function RequestTriage() {
  const [requests, setRequests] = useState<WorkRequestItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [actionTarget, setActionTarget] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [triageNote, setTriageNote] = useState("");
  const [hasNewAlert, setHasNewAlert] = useState(false);

  const selected = useMemo(
    () => requests.find((item) => item._id === selectedId) ?? null,
    [requests, selectedId],
  );

  const loadRequests = async (activeFilters = filters) => {
    setLoading(true);
    try {
      const data = await fetchWorkRequests({
        status: activeFilters.status,
        priority: activeFilters.priority,
        search: activeFilters.search,
      });
      const items = data.items;
      setRequests(items);
      if (items.length) {
        const firstId = items[0]._id;
        const stillSelected =
          selectedId && items.some((item) => item._id === selectedId);
        setSelectedId(stillSelected ? selectedId : firstId);
      } else {
        setSelectedId(null);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to load requests.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadRequests(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.status,
    filters.priority,
    filters.asset,
    filters.location,
    filters.tag,
    filters.search,
  ]);

  useEffect(() => {
    const socket = getNotificationsSocket();
    const handleCreated = () => setHasNewAlert(true);
    socket.on("workRequestCreated", handleCreated);
    return () => {
      socket.off("workRequestCreated", handleCreated);
    };
  }, []);

  const filteredRequests = useMemo(() => {
    const query = filters.search.toLowerCase();
    const assetQuery = filters.asset.toLowerCase();
    const locationQuery = filters.location.toLowerCase();
    const tagQuery = filters.tag.toLowerCase();

    if (!query && !assetQuery && !locationQuery && !tagQuery) return requests;

    return requests.filter((request) => {
      const matchesQuery = !query
        ? true
        : request.title.toLowerCase().includes(query) ||
          (request.description ?? "").toLowerCase().includes(query) ||
          (request.requesterName ?? "").toLowerCase().includes(query);

      const matchesAsset = !assetQuery
        ? true
        : (request.assetTag ?? "").toLowerCase().includes(assetQuery) ||
          (request.asset ?? "").toLowerCase().includes(assetQuery);

      const matchesLocation = !locationQuery
        ? true
        : (request.location ?? "").toLowerCase().includes(locationQuery);

      const matchesTag = !tagQuery
        ? true
        : (request.tags ?? []).some((tag) => tag.toLowerCase().includes(tagQuery));

      return matchesQuery && matchesAsset && matchesLocation && matchesTag;
    });
  }, [filters.asset, filters.location, filters.search, filters.tag, requests]);

  const updateFilter = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const updateStatus = async (
    requestId: string,
    status: WorkRequestDecisionStatus,
    reason?: string,
  ) => {
    setActionTarget(requestId);
    try {
      const updated = await updateWorkRequestStatus(requestId, {
        status,
        reason,
        note: triageNote,
      });
      setRequests((prev) =>
        prev.map((req) =>
          req._id === requestId ? { ...req, ...updated } : req,
        ),
      );
      toast.success("Request updated");
      if (status === "rejected") {
        setRejectionReason("");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to update status.";
      toast.error(message);
    } finally {
      setActionTarget(null);
    }
  };

  const handleConvert = async (requestId: string) => {
    setActionTarget(requestId);
    try {
      const result = await convertWorkRequest(requestId);
      toast.success(`Work order ${result.workOrderId} created`);
      setRequests((prev) =>
        prev.map((req) =>
          req._id === requestId
            ? { ...req, status: "converted", workOrder: result.workOrderId }
            : req,
        ),
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to convert request.";
      toast.error(message);
    } finally {
      setActionTarget(null);
    }
  };

  const resetAlertAndReload = () => {
    setHasNewAlert(false);
    loadRequests(filters);
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--wp-color-text)]">
            Request triage
          </h1>
          <p className="text-sm text-[var(--wp-color-text-muted)]">
            Review incoming submissions, filter by priority or asset, and take
            action from one place.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {hasNewAlert && (
            <button
              type="button"
              onClick={resetAlertAndReload}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-800"
            >
              <AlertTriangle className="h-4 w-4" /> New request received
            </button>
          )}
          <button
            type="button"
            onClick={() => loadRequests(filters)}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--wp-color-border)] px-3 py-2 text-xs font-semibold text-[var(--wp-color-text)] hover:bg-[var(--wp-color-surface)]"
          >
            Refresh
          </button>
        </div>
      </header>

      <section className="rounded-2xl border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-[var(--wp-color-text-muted)]">
            <Filter className="h-4 w-4" /> Filters
          </div>
          <select
            value={filters.status}
            onChange={(evt) => updateFilter("status", evt.target.value)}
            className="rounded-lg border border-[var(--wp-color-border)] px-3 py-2 text-sm"
          >
            {statusFilters.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={filters.priority}
            onChange={(evt) => updateFilter("priority", evt.target.value)}
            className="rounded-lg border border-[var(--wp-color-border)] px-3 py-2 text-sm"
          >
            {priorityFilters.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            value={filters.asset}
            onChange={(evt) => updateFilter("asset", evt.target.value)}
            className="min-w-[160px] rounded-lg border border-[var(--wp-color-border)] px-3 py-2 text-sm"
            placeholder="Asset tag or ID"
          />
          <input
            value={filters.location}
            onChange={(evt) => updateFilter("location", evt.target.value)}
            className="min-w-[140px] rounded-lg border border-[var(--wp-color-border)] px-3 py-2 text-sm"
            placeholder="Location"
          />
          <input
            value={filters.tag}
            onChange={(evt) => updateFilter("tag", evt.target.value)}
            className="min-w-[120px] rounded-lg border border-[var(--wp-color-border)] px-3 py-2 text-sm"
            placeholder="Tag"
          />
          <div className="relative ml-auto">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--wp-color-text-muted)]" />
            <input
              value={filters.search}
              onChange={(evt) => updateFilter("search", evt.target.value)}
              className="w-56 rounded-full border border-[var(--wp-color-border)] px-9 py-2 text-sm"
              placeholder="Search requests"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-3 rounded-2xl border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] p-4 shadow-sm">
          <div className="flex items-center justify-between text-sm text-[var(--wp-color-text-muted)]">
            <span>{filteredRequests.length} request(s)</span>
            {loading && (
              <span className="text-xs text-[var(--wp-color-text-muted)]">Loading…</span>
            )}
          </div>
          {filteredRequests.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-sm text-[var(--wp-color-text-muted)]">
              <Inbox className="h-6 w-6" />
              No requests match your filters.
            </div>
          )}
          <div className="space-y-2">
            {filteredRequests.map((request) => (
              <button
                type="button"
                key={request._id}
                onClick={() => {
                  setSelectedId(request._id);
                  setRejectionReason("");
                  setTriageNote("");
                }}
                className={`w-full rounded-xl border px-3 py-3 text-left transition hover:border-primary-200 hover:bg-primary-50/40 ${
                  selectedId === request._id
                    ? "border-primary-200 bg-primary-50/60"
                    : "border-[var(--wp-color-border)]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[var(--wp-color-text)]">
                      {request.title}
                    </p>
                    <p className="text-xs text-[var(--wp-color-text-muted)] line-clamp-2">
                      {request.description ?? "No description"}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--wp-color-text-muted)]">
                      <span
                        className={`font-semibold ${priorityAccent[request.priority]}`}
                      >
                        {request.priority}
                      </span>
                      <span>{request.requesterName}</span>
                      {request.location && (
                        <span className="rounded-full bg-[var(--wp-color-surface-elevated)] px-2 py-0.5">
                          {request.location}
                        </span>
                      )}
                      {request.tags?.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-700"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase ${statusBadges[request.status]}`}
                  >
                    {request.status}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-3">
          <div className="rounded-2xl border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] p-4 shadow-sm">
            {selected ? (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[var(--wp-color-text-muted)]">
                      Request
                    </p>
                    <h2 className="text-xl font-semibold text-[var(--wp-color-text)]">
                      {selected.title}
                    </h2>
                    <p className="text-sm text-[var(--wp-color-text-muted)]">
                      {selected.description}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--wp-color-text-muted)]">
                      <span
                        className={`font-semibold ${priorityAccent[selected.priority]}`}
                      >
                        {selected.priority} priority
                      </span>
                      {selected.category && (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">
                          {selected.category}
                        </span>
                      )}
                      {selected.assetTag && (
                        <span className="rounded-full bg-[var(--wp-color-surface-elevated)] px-2 py-0.5">
                          {selected.assetTag}
                        </span>
                      )}
                      {selected.location && (
                        <span className="rounded-full bg-[var(--wp-color-surface-elevated)] px-2 py-0.5">
                          {selected.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase ${statusBadges[selected.status]}`}
                  >
                    {selected.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm text-[var(--wp-color-text-muted)]">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[var(--wp-color-text-muted)]">
                      Requester
                    </p>
                    <p className="font-semibold text-[var(--wp-color-text)]">
                      {selected.requesterName}
                    </p>
                    <p>
                      {selected.requesterEmail ||
                        selected.requesterPhone ||
                        "No contact provided"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[var(--wp-color-text-muted)]">
                      Tags
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selected.tags?.length ? (
                        selected.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700"
                          >
                            #{tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-[var(--wp-color-text-muted)]">No tags</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[var(--wp-color-text-muted)]">
                      Attachments
                    </p>
                    <div className="space-y-1">
                      {selected.photos?.length ? (
                        selected.photos.map((photo) => (
                          <a
                            key={photo}
                            href={`/static/uploads/${photo}`}
                            target="_blank"
                            rel="noreferrer"
                            className="block text-primary-700 hover:underline"
                          >
                            {photo.split("/").pop()}
                          </a>
                        ))
                      ) : (
                        <span className="text-[var(--wp-color-text-muted)]">No photos</span>
                      )}
                      {selected.attachments?.length
                        ? selected.attachments.map((attachment) => (
                            <div
                              key={attachment.key}
                              className="text-xs text-[var(--wp-color-text-muted)]"
                            >
                              <span className="font-semibold">
                                {attachment.key}
                              </span>{" "}
                              – {attachment.paths.length} file(s)
                            </div>
                          ))
                        : null}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[var(--wp-color-text-muted)]">
                      Work order
                    </p>
                    {selected.workOrder ? (
                      <Link
                        to={`/work-orders/${selected.workOrder}`}
                        className="text-primary-700 underline underline-offset-2"
                      >
                        WO #{selected.workOrder}
                      </Link>
                    ) : (
                      <span className="text-[var(--wp-color-text-muted)]">Not converted</span>
                    )}
                    {selected.rejectionReason && (
                      <p className="mt-1 text-xs text-rose-600">
                        Reason: {selected.rejectionReason}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2 rounded-xl bg-[var(--wp-color-surface)] p-3">
                  <label
                    className="text-xs font-semibold uppercase tracking-wide text-[var(--wp-color-text-muted)]"
                    htmlFor="triageNote"
                  >
                    Triage note
                  </label>
                  <textarea
                    id="triageNote"
                    className="w-full rounded-lg border border-[var(--wp-color-border)] px-3 py-2 text-sm"
                    rows={2}
                    value={triageNote}
                    onChange={(evt) => setTriageNote(evt.target.value)}
                    placeholder="Add internal notes before taking action"
                  />
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => updateStatus(selected._id, "accepted")}
                    disabled={actionTarget === selected._id}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConvert(selected._id)}
                    disabled={
                      !!selected.workOrder || actionTarget === selected._id
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-primary-600 px-3 py-2 text-sm font-semibold text-[var(--wp-color-text)] hover:bg-primary-700 disabled:opacity-60"
                  >
                    {selected.workOrder
                      ? `WO #${selected.workOrder}`
                      : "Convert to Work Order"}
                  </button>
                </div>

                <div className="space-y-2 rounded-xl border border-rose-200 bg-rose-50 p-3">
                  <label
                    className="text-xs font-semibold uppercase tracking-wide text-rose-600"
                    htmlFor="rejectionReason"
                  >
                    Reject with reason
                  </label>
                  <textarea
                    id="rejectionReason"
                    className="w-full rounded-lg border border-rose-200 px-3 py-2 text-sm"
                    rows={2}
                    value={rejectionReason}
                    onChange={(evt) => setRejectionReason(evt.target.value)}
                    placeholder="Share why this request is being declined"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      rejectionReason.trim()
                        ? updateStatus(
                            selected._id,
                            "rejected",
                            rejectionReason,
                          )
                        : toast.error("Add a rejection reason first.")
                    }
                    disabled={actionTarget === selected._id}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-200 bg-[var(--wp-color-surface)] px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                  >
                    <X className="h-4 w-4" /> Reject
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-sm text-[var(--wp-color-text-muted)]">
                <Inbox className="h-6 w-6" />
                Select a request to triage.
              </div>
            )}
          </div>
          <EntityAuditList
            entityType="WorkRequest"
            entityId={selected?._id}
            siteId={selected?.siteId}
            limit={8}
          />
        </div>
      </section>
    </div>
  );
}

