/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { z } from "zod";

import { searchAssets } from "@/api/search";
import type { WorkRequestStatus } from "@/api/workRequests";

type PublicStatus = {
  token: string;
  status: WorkRequestStatus;
  title: string;
  description?: string;
  createdAt?: string;
  workOrderId?: string;
  photos?: string[];
  updates?: Array<{ label: string; description?: string; timestamp?: string }>;
};

type SubmissionResponse = {
  requestId: string;
  token: string;
  status: WorkRequestStatus;
};

const optionalString = z
  .union([z.string(), z.undefined(), z.null()])
  .transform((value) => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  });

const requestSchema = z.object({
  title: z.string().trim().min(3, "Add a short title"),
  description: z.string().trim().min(10, "Share a bit more detail"),
  requesterName: z.string().trim().min(2, "Your name helps us respond"),
  requesterEmail: optionalString.refine(
    (value) => !value || /.+@.+\..+/.test(value),
    "Enter a valid email",
  ),
  requesterPhone: optionalString,
  location: optionalString,
  assetTag: optionalString,
  asset: optionalString,
  category: optionalString,
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  tags: z
    .preprocess(
      (value) => {
        if (Array.isArray(value)) return value;
        if (typeof value === "string")
          return value
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean);
        return [];
      },
      z.array(z.string().trim().min(2)).max(6),
    )
    .optional(),
});

type RequestFormValues = z.infer<typeof requestSchema>;

const initialFormState: RequestFormValues = {
  title: "",
  description: "",
  requesterName: "",
  requesterEmail: "",
  requesterPhone: "",
  location: "",
  assetTag: "",
  asset: "",
  category: "",
  priority: "medium",
  tags: [],
};

const priorityOptions: Array<{
  value: RequestFormValues["priority"];
  label: string;
}> = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const statusLabelMap: Record<WorkRequestStatus, string> = {
  new: "Submitted",
  reviewing: "Reviewing",
  accepted: "Accepted",
  rejected: "Rejected",
  converted: "Converted to work order",
  closed: "Closed",
  deleted: "Archived",
};

const statusToneMap: Record<WorkRequestStatus, string> = {
  new: "bg-amber-100 text-amber-800",
  reviewing: "bg-blue-100 text-blue-800",
  accepted: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
  converted: "bg-emerald-100 text-emerald-800",
  closed: "bg-neutral-200 text-neutral-700",
  deleted: "bg-neutral-200 text-neutral-700",
};

export default function PublicRequestPage() {
  const { slug = "default" } = useParams();
  const [values, setValues] = useState<RequestFormValues>(initialFormState);
  const [tagInput, setTagInput] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusToken, setStatusToken] = useState("");
  const [submissionResult, setSubmissionResult] =
    useState<SubmissionResponse | null>(null);
  const [statusResult, setStatusResult] = useState<PublicStatus | null>(null);
  const [submitError, setSubmitError] = useState<string>();
  const [statusError, setStatusError] = useState<string>();
  const [copyMessage, setCopyMessage] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [assetSearch, setAssetSearch] = useState("");
  const [assetOptions, setAssetOptions] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [assetSearching, setAssetSearching] = useState(false);

  useEffect(() => {
    if (assetSearch.trim().length < 2) {
      setAssetOptions([]);
      return;
    }
    let cancelled = false;
    setAssetSearching(true);
    searchAssets(assetSearch)
      .then((results) => {
        if (!cancelled) setAssetOptions(results);
      })
      .catch(() => {
        if (!cancelled) setAssetOptions([]);
      })
      .finally(() => {
        if (!cancelled) setAssetSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [assetSearch]);

  useEffect(() => {
    if (!copyMessage) return;
    const timer = window.setTimeout(() => setCopyMessage(undefined), 2400);
    return () => window.clearTimeout(timer);
  }, [copyMessage]);

  const isFormValid = useMemo(() => {
    const parsed = requestSchema.safeParse({ ...values, tags: values.tags });
    return parsed.success;
  }, [values]);

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (!trimmed) return;
    const normalized = trimmed.toLowerCase();
    if ((values.tags ?? []).some((tag) => tag.toLowerCase() === normalized)) {
      setFieldErrors((prev) => ({ ...prev, tags: "Tag already added" }));
      return;
    }
    if ((values.tags?.length ?? 0) >= 6) {
      setFieldErrors((prev) => ({ ...prev, tags: "Up to 6 tags allowed" }));
      return;
    }
    setValues((prev) => ({ ...prev, tags: [...(prev.tags ?? []), trimmed] }));
    setFieldErrors((prev) => ({ ...prev, tags: "" }));
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    setValues((prev) => ({
      ...prev,
      tags: (prev.tags ?? []).filter((item) => item !== tag),
    }));
    setFieldErrors((prev) => ({ ...prev, tags: "" }));
  };

  const handleChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.files;
    if (!next) {
      setFiles(null);
      return;
    }
    if (next.length > 5) {
      setFieldErrors((prev) => ({
        ...prev,
        files: "Attach up to 5 files per request",
      }));
      event.target.value = "";
      setFiles(null);
      return;
    }
    const tooLarge = Array.from(next).find((file) => file.size > 10 * 1024 * 1024);
    if (tooLarge) {
      setFieldErrors((prev) => ({
        ...prev,
        files: `File "${tooLarge.name}" exceeds 10MB`,
      }));
      event.target.value = "";
      setFiles(null);
      return;
    }
    setFieldErrors((prev) => ({ ...prev, files: "" }));
    setFiles(next);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldErrors({});
    const parse = requestSchema.safeParse({ ...values, tags: values.tags });
    if (!parse.success) {
      const errs: Record<string, string> = {};
      parse.error.issues.forEach((issue) => {
        if (issue.path[0]) errs[issue.path[0] as string] = issue.message;
      });
      setFieldErrors(errs);
      return;
    }
    setSubmitting(true);
    setSubmitError(undefined);
    setStatusError(undefined);
    try {
      const formData = new FormData();
      Object.entries(parse.data).forEach(([key, value]) => {
        if (!value) return;
        if (Array.isArray(value)) {
          value.forEach((entry) => formData.append(key, entry));
        } else {
          formData.append(key, value as string);
        }
      });
      formData.append("formSlug", slug);
      if (files) {
        Array.from(files).forEach((file) => formData.append("photos", file));
      }
      const response = await fetch("/api/public/work-requests", {
        method: "POST",
        body: formData,
      });
      const payload = await response
        .json()
        .catch(() => ({ error: "Unable to submit request." }));
      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to submit request.");
      }
      const submission: SubmissionResponse = payload.data ?? payload;
      setSubmissionResult(submission);
      setStatusToken(submission.token);
      setValues(initialFormState);
      setFiles(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setAssetSearch("");
      setFieldErrors({});
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to submit request.";
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusLookup = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    const trimmed = statusToken.trim();
    if (!trimmed) return;
    setStatusError(undefined);
    setSubmitError(undefined);
    setStatusLoading(true);
    try {
      const response = await fetch(
        `/api/public/work-requests/${encodeURIComponent(trimmed)}`,
      );
      const payload = await response
        .json()
        .catch(() => ({ error: "Unable to find request." }));
      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to find request.");
      }
      setStatusResult(payload.data ?? payload);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to lookup request.";
      setStatusError(message);
      setStatusResult(null);
    } finally {
      setStatusLoading(false);
    }
  };

  const hasFiles = files && files.length > 0;

  const copyToClipboard = async (value: string, successMessage: string) => {
    if (!value) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const input = document.createElement("textarea");
        input.value = value;
        input.setAttribute("readonly", "true");
        input.style.position = "absolute";
        input.style.left = "-9999px";
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
      }
      setSubmitError(undefined);
      setStatusError(undefined);
      setCopyMessage(successMessage);
      setFieldErrors((prev) => ({ ...prev, copy: "" }));
    } catch {
      setFieldErrors((prev) => ({ ...prev, copy: "Unable to copy to clipboard" }));
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-3 py-6 sm:gap-6 sm:px-4 sm:py-8 md:flex-row md:items-start md:gap-8 md:py-10">
        <section className="flex-1 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-6">
          <h1 className="text-2xl font-semibold text-neutral-900">
            Work Request Portal
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Submit an issue for the maintenance team. Required fields are
            validated before sending.
          </p>
          <form className="mt-5 space-y-4 sm:mt-6" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="title"
                  className="text-sm font-medium text-neutral-700"
                >
                  Title
                </label>
                <input
                  id="title"
                  name="title"
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  value={values.title}
                  onChange={handleChange}
                  required
                />
                {fieldErrors.title && (
                  <p className="text-xs text-red-600">{fieldErrors.title}</p>
                )}
              </div>
              <div>
                <label
                  htmlFor="priority"
                  className="text-sm font-medium text-neutral-700"
                >
                  Priority
                </label>
                <select
                  id="priority"
                  name="priority"
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  value={values.priority}
                  onChange={handleChange}
                >
                  {priorityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label
                htmlFor="description"
                className="text-sm font-medium text-neutral-700"
              >
                Description
              </label>
              <textarea
                id="description"
                name="description"
                className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                rows={4}
                value={values.description}
                onChange={handleChange}
                required
              />
              {fieldErrors.description && (
                <p className="text-xs text-red-600">
                  {fieldErrors.description}
                </p>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="requesterName"
                  className="text-sm font-medium text-neutral-700"
                >
                  Your name
                </label>
                <input
                  id="requesterName"
                  name="requesterName"
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  value={values.requesterName}
                  onChange={handleChange}
                  required
                />
                {fieldErrors.requesterName && (
                  <p className="text-xs text-red-600">
                    {fieldErrors.requesterName}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="requesterEmail"
                  className="text-sm font-medium text-neutral-700"
                >
                  Email
                </label>
                <input
                  id="requesterEmail"
                  name="requesterEmail"
                  type="email"
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  value={values.requesterEmail ?? ""}
                  onChange={handleChange}
                />
                {fieldErrors.requesterEmail && (
                  <p className="text-xs text-red-600">
                    {fieldErrors.requesterEmail}
                  </p>
                )}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="requesterPhone"
                  className="text-sm font-medium text-neutral-700"
                >
                  Phone
                </label>
                <input
                  id="requesterPhone"
                  name="requesterPhone"
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  value={values.requesterPhone ?? ""}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label
                  htmlFor="location"
                  className="text-sm font-medium text-neutral-700"
                >
                  Location
                </label>
                <input
                  id="location"
                  name="location"
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  value={values.location ?? ""}
                  onChange={handleChange}
                  placeholder="Building, floor, or area"
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="assetTag"
                  className="text-sm font-medium text-neutral-700"
                >
                  Asset tag (free text)
                </label>
                <input
                  id="assetTag"
                  name="assetTag"
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  value={values.assetTag ?? ""}
                  onChange={handleChange}
                  placeholder="e.g. Pump-14"
                />
              </div>
              <div>
                <label
                  className="text-sm font-medium text-neutral-700"
                  htmlFor="asset"
                >
                  Link to asset (search)
                </label>
                <input
                  id="asset"
                  name="asset"
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  value={assetSearch}
                  onChange={(evt) => {
                    const next = evt.target.value;
                    setAssetSearch(next);
                    setValues((prev) => ({ ...prev, asset: undefined }));
                  }}
                  placeholder="Start typing to search assets"
                />
                {assetSearching && (
                  <p className="text-xs text-neutral-500">Searching assets...</p>
                )}
                {assetOptions.length > 0 && (
                  <div className="mt-2 space-y-1 rounded-lg border border-neutral-200 bg-neutral-50 p-2 text-sm text-neutral-700">
                    {assetOptions.map((option) => (
                      <button
                        type="button"
                        key={option.id}
                        className={`flex w-full items-center justify-between rounded-md px-2 py-1 text-left hover:bg-neutral-100 ${values.asset === option.id ? "bg-primary-50 text-primary-700" : ""}`}
                        onClick={() => {
                          setValues((prev) => ({ ...prev, asset: option.id }));
                          setAssetSearch(option.name);
                        }}
                      >
                        <span>{option.name}</span>
                        {values.asset === option.id && (
                          <span className="text-xs font-semibold">
                            Selected
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="category"
                  className="text-sm font-medium text-neutral-700"
                >
                  Category
                </label>
                <input
                  id="category"
                  name="category"
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  value={values.category ?? ""}
                  onChange={handleChange}
                  placeholder="Safety, Facilities, etc."
                />
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-700">
                  Tags
                </label>
                <div className="mt-1 rounded-lg border border-neutral-300 px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    {(values.tags ?? []).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-800"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="text-primary-700"
                        >
                          x
                        </button>
                      </span>
                    ))}
                    <input
                      className="flex-1 min-w-[120px] border-none text-sm focus:outline-none"
                      value={tagInput}
                      onChange={(evt) => setTagInput(evt.target.value)}
                      onKeyDown={(evt) => {
                        if (evt.key === "Enter") {
                          evt.preventDefault();
                          addTag();
                        }
                      }}
                      placeholder="Add tag and press Enter"
                    />
                  </div>
                </div>
                {fieldErrors.tags && (
                  <p className="text-xs text-red-600">{fieldErrors.tags}</p>
                )}
              </div>
            </div>
            <div>
              <label htmlFor="photos" className="text-sm font-medium text-neutral-700">
                Attachments
              </label>
              <input
                ref={fileInputRef}
                id="photos"
                name="photos"
                type="file"
                multiple
                accept="image/*"
                onChange={handleFiles}
                className="mt-1 block w-full text-sm text-neutral-500"
              />
              {fieldErrors.files && (
                <p className="text-xs text-red-600">{fieldErrors.files}</p>
              )}
              {hasFiles && (
                <p className="text-xs text-neutral-500">
                  {files &&
                    Array.from(files)
                      .map((file) => file.name)
                      .join(", ")}
                </p>
              )}
            </div>
            {submitError && <p className="text-sm text-red-600">{submitError}</p>}
            <button
              type="submit"
              className="w-full rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-70"
              disabled={!isFormValid || submitting}
            >
              {submitting ? "Submitting..." : "Submit request"}
            </button>
            {submissionResult && (
              <div className="space-y-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
                <p className="break-all">
                  Thank you! Save this token to check status later:{" "}
                  <strong>{submissionResult.token}</strong>
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      void copyToClipboard(
                        submissionResult.token,
                        "Request token copied",
                      )
                    }
                    className="rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                  >
                    Copy token
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void copyToClipboard(
                        submissionResult.requestId,
                        "Request ID copied",
                      )
                    }
                    className="rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                  >
                    Copy request ID
                  </button>
                </div>
                <p>
                  Your request ID is{" "}
                  <strong>{submissionResult.requestId}</strong>. You can open{" "}
                  <a
                    className="font-semibold underline"
                    href={`/request/${submissionResult.token}`}
                  >
                    work request status
                  </a>{" "}
                  to see technician updates.
                </p>
              </div>
            )}
            {copyMessage && (
              <p className="text-xs text-emerald-700">{copyMessage}</p>
            )}
            {fieldErrors.copy && (
              <p className="text-xs text-red-600">{fieldErrors.copy}</p>
            )}
          </form>
        </section>

        <section className="w-full max-w-xl space-y-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-6 md:sticky md:top-6">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">
              Check status
            </h2>
            <p className="text-sm text-neutral-500">
              Use your token to see where things stand.
            </p>
          </div>
          <form className="space-y-3" onSubmit={handleStatusLookup}>
            <label
              className="text-sm font-medium text-neutral-700"
              htmlFor="statusToken"
            >
              Request token
            </label>
            <input
              id="statusToken"
              name="statusToken"
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
              value={statusToken}
              onChange={(evt) => setStatusToken(evt.target.value)}
              placeholder="Enter your token"
            />
            <button
              type="submit"
              className="w-full rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={statusLoading || !statusToken.trim()}
            >
              {statusLoading ? "Checking..." : "Check status"}
            </button>
          </form>
          {statusError && <p className="text-sm text-red-600">{statusError}</p>}
          {copyMessage && (
            <p className="text-xs text-emerald-700">{copyMessage}</p>
          )}
          {statusResult && (
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
              <p className="text-xs uppercase tracking-wide text-neutral-500">
                Current status
              </p>
              <h3 className="text-xl font-semibold text-neutral-900">
                {statusResult.title}
              </h3>
              <p className="text-sm text-neutral-600">
                {statusResult.description}
              </p>
              <p className="mt-2">
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusToneMap[statusResult.status]}`}
                >
                  {statusLabelMap[statusResult.status]}
                </span>
              </p>
              {statusResult.workOrderId && (
                <p className="text-xs text-neutral-500">
                  Linked work order: {statusResult.workOrderId}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void copyToClipboard(statusToken, "Request token copied")}
                  className="rounded-full border border-neutral-300 bg-white px-3 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
                >
                  Copy token
                </button>
                {statusResult.workOrderId ? (
                  <button
                    type="button"
                    onClick={() =>
                      void copyToClipboard(
                        statusResult.workOrderId ?? "",
                        "Work order ID copied",
                      )
                    }
                    className="rounded-full border border-neutral-300 bg-white px-3 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
                  >
                    Copy work order ID
                  </button>
                ) : null}
              </div>
              {statusResult.updates?.length ? (
                <div className="mt-3 space-y-2 text-sm text-neutral-700">
                  {statusResult.updates.map((update, index) => (
                    <div
                      key={`${update.label}-${index}`}
                      className="rounded-lg bg-white/80 p-2 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{update.label}</span>
                        <span className="text-xs text-neutral-500">
                          {update.timestamp
                            ? new Date(update.timestamp).toLocaleString()
                            : "--"}
                        </span>
                      </div>
                      <p className="text-sm text-neutral-600">
                        {update.description}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}



