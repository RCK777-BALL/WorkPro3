/*
 * SPDX-License-Identifier: MIT
 */

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "react-query";

import { fetchTemplateLibrary, cloneTemplateIntoTenant } from "@/api/templates";
import { deletePmTemplate, fetchPmTemplates } from "@/api/pm";
import Button from "@/components/common/Button";
import Card from "@/components/common/Card";
import { PM_TEMPLATES_QUERY_KEY } from "@/features/pm/hooks";
import type { PMTemplate } from "@/types";

const TemplateCard = ({ template, onEdit, onDelete }: { template: PMTemplate; onEdit: () => void; onDelete: () => void }) => (
  <Card className="flex flex-col justify-between gap-3 p-4">
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-base font-semibold text-[var(--wp-color-text)]">{template.name}</p>
          <p className="text-xs uppercase tracking-wide text-[var(--wp-color-text-muted)]">{template.category}</p>
        </div>
        <span className="rounded-full bg-[var(--wp-color-surface-elevated)] px-3 py-1 text-xs font-medium text-[var(--wp-color-text-muted)]">
          {template.tasks.length} task{template.tasks.length === 1 ? "" : "s"}
        </span>
      </div>
      {template.description && <p className="text-sm text-[var(--wp-color-text-muted)]">{template.description}</p>}
      <p className="text-xs text-[var(--wp-color-text-muted)]">
        Estimated effort: {template.estimatedMinutes ? `${template.estimatedMinutes} min` : "Not set"}
      </p>
    </div>
    <div className="flex items-center gap-2">
      <Button size="sm" onClick={onEdit}>
        Edit
      </Button>
      <Button size="sm" variant="ghost" onClick={onDelete}>
        Delete
      </Button>
    </div>
  </Card>
);

const LibraryCard = ({
  name,
  description,
  category,
  onClone,
}: {
  name: string;
  description: string;
  category: string;
  onClone: () => void;
}) => (
  <Card className="flex flex-col gap-2 p-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-base font-semibold text-[var(--wp-color-text)]">{name}</p>
        <p className="text-xs uppercase tracking-wide text-[var(--wp-color-text-muted)]">{category}</p>
      </div>
      <Sparkles className="h-4 w-4 text-primary-500" />
    </div>
    <p className="text-sm text-[var(--wp-color-text-muted)]">{description}</p>
    <Button size="sm" onClick={onClone}>
      Clone template
    </Button>
  </Card>
);

export default function PMTemplateList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const templatesQuery = useQuery({ queryKey: PM_TEMPLATES_QUERY_KEY, queryFn: fetchPmTemplates });
  const libraryQuery = useQuery({ queryKey: ["pm", "template-library"], queryFn: fetchTemplateLibrary });

  const cloneMutation = useMutation({
    mutationFn: cloneTemplateIntoTenant,
    onSuccess: () => {
      void queryClient.invalidateQueries(PM_TEMPLATES_QUERY_KEY);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (templateId: string) => deletePmTemplate(templateId),
    onSuccess: () => {
      void queryClient.invalidateQueries(PM_TEMPLATES_QUERY_KEY);
    },
  });

  const sortedTemplates = useMemo(() => {
    return (templatesQuery.data ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [templatesQuery.data]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--wp-color-text)]">PM templates</h1>
          <p className="text-sm text-[var(--wp-color-text-muted)]">
            Manage preventive maintenance templates and quickly clone best practices into your workspace.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => templatesQuery.refetch()}>
            Refresh
          </Button>
          <Button onClick={() => navigate("/pm/templates/new")}>
            <Plus className="mr-2 h-4 w-4" /> New template
          </Button>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <Card className="space-y-4 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-base font-semibold text-[var(--wp-color-text)]">Your templates</p>
              <p className="text-sm text-[var(--wp-color-text-muted)]">Edit or assign templates to keep schedules up to date.</p>
            </div>
            <span className="flex items-center gap-1 text-sm text-[var(--wp-color-text-muted)]">
              <Trash2 className="h-4 w-4" />
              {sortedTemplates.length}
            </span>
          </div>
          {templatesQuery.isLoading && <p className="text-sm text-[var(--wp-color-text-muted)]">Loading templates...</p>}
          {templatesQuery.isError && <p className="text-sm text-error-500">Failed to load templates.</p>}
          {!templatesQuery.isLoading && sortedTemplates.length === 0 && (
            <p className="text-sm text-[var(--wp-color-text-muted)]">No templates found. Clone one from the library to get started.</p>
          )}
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {sortedTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onEdit={() => navigate(`/pm/templates/${template.id}/edit`)}
                onDelete={() => deleteMutation.mutate(template.id)}
              />
            ))}
          </div>
        </Card>

        <Card className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <p className="text-base font-semibold text-[var(--wp-color-text)]">Template library</p>
            {libraryQuery.isLoading && <span className="text-xs text-[var(--wp-color-text-muted)]">Loading...</span>}
          </div>
          {libraryQuery.isError && <p className="text-sm text-error-500">Could not load template library.</p>}
          <div className="grid gap-3">
            {(libraryQuery.data ?? []).map((item) => (
              <LibraryCard
                key={item.id}
                name={item.title}
                description={item.description}
                category={item.category}
                onClone={() => cloneMutation.mutate(item.id)}
              />
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}

