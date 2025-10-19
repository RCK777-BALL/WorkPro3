/*
 * SPDX-License-Identifier: MIT
 */

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import {
  Activity,
  AlertTriangle,
  Bot,
  Building2,
  Cpu,
  Database,
  KeyRound,
  Palette,
  Search,
  Shield,
  ShieldCheck,
  Zap,
} from "lucide-react";

import AdminSettingModal from "@/components/admin/AdminSettingModal";
import Button from "@/components/common/Button";
import StatusBadge from "@/components/common/StatusBadge";
import { api, getErrorMessage } from "@/lib/api";
import type {
  AdminSettingDetail,
  AdminSettingSection,
  AdminSettingStatus,
  AdminSettingsPayload,
  AdminSettingsUpdatePayload,
  CreateApiKeyResponse,
} from "@shared/admin";
import { ADMIN_SETTING_TEMPLATES } from "@shared/admin";

const STATUS_FILTERS: Array<{ label: string; value: AdminSettingStatus | "all" }> = [
  { label: "All", value: "all" },
  { label: "Active", value: "Active" },
  { label: "In Progress", value: "In Progress" },
  { label: "Pending", value: "Pending" },
  { label: "Disabled", value: "Disabled" },
  { label: "Completed", value: "Completed" },
];

const sectionIcons: Record<AdminSettingSection, JSX.Element> = {
  site: <Building2 className="h-5 w-5 text-indigo-300" />,
  roles: <ShieldCheck className="h-5 w-5 text-indigo-300" />,
  auth: <Shield className="h-5 w-5 text-indigo-300" />,
  audit: <Activity className="h-5 w-5 text-indigo-300" />,
  integrations: <KeyRound className="h-5 w-5 text-indigo-300" />,
  notifications: <AlertTriangle className="h-5 w-5 text-indigo-300" />,
  ai: <Bot className="h-5 w-5 text-indigo-300" />,
  iot: <Cpu className="h-5 w-5 text-indigo-300" />,
  backup: <Database className="h-5 w-5 text-indigo-300" />,
  branding: <Palette className="h-5 w-5 text-indigo-300" />,
};

const statusAccent: Record<AdminSettingStatus, string> = {
  Active: "from-emerald-500/20 to-emerald-500/0 border-emerald-500/40",
  "In Progress": "from-amber-500/20 to-amber-500/0 border-amber-500/40",
  Pending: "from-sky-500/20 to-sky-500/0 border-sky-500/40",
  Disabled: "from-rose-500/20 to-rose-500/0 border-rose-500/40",
  Completed: "from-emerald-500/20 to-emerald-500/0 border-emerald-500/40",
};

const fetchSettings = async (): Promise<AdminSettingsPayload> => {
  const response = await api.get("/admin/settings");
  return (response.data?.data ?? response.data) as AdminSettingsPayload;
};

const keywordMap = new Map<AdminSettingSection, string[]>(
  ADMIN_SETTING_TEMPLATES.map((template) => [template.section, template.keywords]),
);

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<AdminSettingStatus | "all">("all");
  const [selectedSetting, setSelectedSetting] = useState<AdminSettingDetail | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading, isFetching, error } = useQuery(["admin-settings"], fetchSettings, {
    staleTime: 0,
  });

  const sections = data?.sections ?? [];
  const apiKeys = data?.apiKeys ?? [];

  const filteredSections = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return sections.filter((section) => {
      if (statusFilter !== "all" && section.status !== statusFilter) {
        return false;
      }
      if (!normalizedSearch) return true;
      const keywords = keywordMap.get(section.section) ?? [];
      const haystack = [
        section.title,
        section.description,
        section.section,
        section.updatedByName ?? "",
        ...keywords,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [sections, searchTerm, statusFilter]);

  const updateCache = (updated: AdminSettingDetail) => {
    queryClient.setQueryData<AdminSettingsPayload | undefined>(["admin-settings"], (previous) => {
      if (!previous) return previous;
      const nextSections = previous.sections.map((entry) =>
        entry.section === updated.section ? updated : entry,
      );
      return { ...previous, sections: nextSections };
    });
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedSetting(null);
  };

  const updateMutation = useMutation(
    async ({ section, payload }: { section: AdminSettingSection; payload: AdminSettingsUpdatePayload }) => {
      const response = await api.put(`/admin/settings/${section}`, payload);
      return (response.data?.data ?? response.data) as AdminSettingDetail;
    },
    {
      onSuccess: (detail) => {
        updateCache(detail);
        setSelectedSetting(detail);
        toast.success("Setting updated");
      },
      onError: (err) => {
        toast.error(getErrorMessage(err));
      },
    },
  );

  const resetMutation = useMutation(
    async (section: AdminSettingSection) => {
      const response = await api.put(`/admin/settings/${section}`, { reset: true });
      return (response.data?.data ?? response.data) as AdminSettingDetail;
    },
    {
      onSuccess: (detail) => {
        updateCache(detail);
        setSelectedSetting(detail);
        toast.success("Setting reset to defaults");
      },
      onError: (err) => {
        toast.error(getErrorMessage(err));
      },
    },
  );

  const createApiKeyMutation = useMutation(
    async (payload: { label: string; scopes: string[]; expiresAt?: string }) => {
      const response = await api.post("/admin/integrations", payload);
      return (response.data?.data ?? response.data) as CreateApiKeyResponse;
    },
    {
      onSuccess: () => {
        void queryClient.invalidateQueries(["admin-settings"]);
      },
      onError: (err) => {
        toast.error(getErrorMessage(err));
      },
    },
  );

  const revokeKeyMutation = useMutation(
    async (id: string) => {
      await api.delete(`/admin/integrations/${id}`);
    },
    {
      onSuccess: () => {
        void queryClient.invalidateQueries(["admin-settings"]);
      },
      onError: (err) => {
        toast.error(getErrorMessage(err));
      },
    },
  );

  const openModalFor = (section: AdminSettingDetail) => {
    setSelectedSetting(section);
    setModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-gray-200">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="space-y-2">
          <nav className="text-xs uppercase tracking-wide text-slate-500">
            Home / <span className="text-slate-300">Admin</span>
          </nav>
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-white">Admin Settings</h1>
              <p className="text-sm text-slate-400">
                Configure your system preferences and organizational controls.
              </p>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search settings"
                  className="w-64 rounded-lg border border-slate-800 bg-slate-900 px-9 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            {STATUS_FILTERS.map((filter) => {
              const isActive = statusFilter === filter.value;
              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setStatusFilter(filter.value)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    isActive
                      ? "border-indigo-500 bg-indigo-500/20 text-indigo-200"
                      : "border-slate-800 bg-slate-900 text-slate-400 hover:border-indigo-500/60 hover:text-indigo-200"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </header>

        {error && (
          <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
            {getErrorMessage(error)}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(isLoading || isFetching) && sections.length === 0
            ? Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-48 rounded-2xl border border-slate-800 bg-slate-900/60">
                  <div className="h-full w-full animate-pulse rounded-2xl bg-slate-800/40" />
                </div>
              ))
            : filteredSections.map((section) => (
                <article
                  key={section.section}
                  className={`group flex h-full flex-col justify-between rounded-2xl border bg-slate-900/80 p-5 shadow-lg transition hover:border-indigo-500/60 hover:bg-slate-900 ${
                    statusAccent[section.status]
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {sectionIcons[section.section]}
                        <div>
                          <h2 className="text-lg font-semibold text-white">{section.title}</h2>
                          <p className="text-xs uppercase tracking-wide text-slate-500">
                            {section.section.toUpperCase()}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={section.status} size="sm" />
                    </div>
                    <p className="text-sm text-slate-300">{section.description}</p>
                  </div>
                  <div className="mt-4 space-y-2 text-xs text-slate-500">
                    <div className="flex items-center justify-between">
                      <span>Last updated</span>
                      <span>{section.updatedAt ? new Date(section.updatedAt).toLocaleString() : "—"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Owner</span>
                      <span>{section.updatedByName ?? "System"}</span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
                      {(keywordMap.get(section.section) ?? []).slice(0, 3).map((keyword) => (
                        <span
                          key={keyword}
                          className="rounded-full border border-slate-800 bg-slate-900 px-2 py-0.5"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                    <Button
                      variant="primary"
                      className="bg-gradient-to-r from-indigo-500 via-indigo-400 to-cyan-500 text-white shadow-md hover:from-indigo-400 hover:to-cyan-400"
                      onClick={() => openModalFor(section)}
                      icon={<Zap className="h-4 w-4" />}
                    >
                      Configure
                    </Button>
                  </div>
                </article>
              ))}
        </section>
        {!isLoading && !isFetching && filteredSections.length === 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-center text-sm text-slate-400">
            No settings match your filters. Try adjusting the search or status filter.
          </div>
        )}
      </div>

      <AdminSettingModal
        open={modalOpen && Boolean(selectedSetting)}
        setting={selectedSetting ?? undefined}
        apiKeys={apiKeys}
        onClose={handleModalClose}
        onSubmit={(section, payload) => updateMutation.mutateAsync({ section, payload })}
        onReset={(section) => resetMutation.mutateAsync(section)}
        onCreateApiKey={(payload) => createApiKeyMutation.mutateAsync(payload)}
        onRevokeApiKey={(id) => revokeKeyMutation.mutateAsync(id)}
        isSaving={updateMutation.isLoading}
        isResetting={resetMutation.isLoading}
        isCreatingKey={createApiKeyMutation.isLoading}
        revokingKeyId={revokeKeyMutation.isLoading ? (revokeKeyMutation.variables as string | undefined) ?? null : null}
      />
    </div>
  );
}
