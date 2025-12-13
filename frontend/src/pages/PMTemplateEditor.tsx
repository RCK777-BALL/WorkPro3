/*
 * SPDX-License-Identifier: MIT
 */

import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";

import Button from "@/components/common/Button";
import Card from "@/components/common/Card";
import Input from "@/components/common/Input";
import TextArea from "@/components/common/TextArea";
import { useCreatePmTemplate, usePmTemplate, useUpdatePmTemplate } from "@/features/pm/hooks";
import type { PMTemplateUpsertInput } from "@/types";

const emptyTemplate: PMTemplateUpsertInput = {
  name: "",
  category: "",
  description: "",
  tasks: [""],
  estimatedMinutes: undefined,
};

const TaskList = ({
  tasks,
  onChange,
}: {
  tasks: string[];
  onChange: (tasks: string[]) => void;
}) => {
  const updateTask = (index: number, value: string) => {
    const next = [...tasks];
    next[index] = value;
    onChange(next);
  };

  const removeTask = (index: number) => {
    const next = tasks.filter((_, i) => i !== index);
    onChange(next.length ? next : [""]);
  };

  return (
    <div className="space-y-2">
      {tasks.map((task, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <Input
            value={task}
            onChange={(e) => updateTask(idx, e.target.value)}
            placeholder="Task description"
            className="flex-1"
          />
          <Button
            type="button"
            variant="ghost"
            onClick={() => removeTask(idx)}
            aria-label="Remove task"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...tasks, ""])}>
        <Plus className="mr-2 h-4 w-4" /> Add task
      </Button>
    </div>
  );
};

export default function PMTemplateEditor() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(templateId && templateId !== "new");

  const templateQuery = usePmTemplate(isEditing ? templateId : undefined);
  const createMutation = useCreatePmTemplate();
  const updateMutation = useUpdatePmTemplate();

  const [form, setForm] = React.useState<PMTemplateUpsertInput>(emptyTemplate);

  React.useEffect(() => {
    if (templateQuery.data && isEditing) {
      setForm({
        name: templateQuery.data.name,
        category: templateQuery.data.category,
        description: templateQuery.data.description ?? "",
        tasks: templateQuery.data.tasks.length ? templateQuery.data.tasks : [""],
        estimatedMinutes: templateQuery.data.estimatedMinutes,
      });
    }
  }, [templateQuery.data, isEditing]);

  const handleChange = (key: keyof PMTemplateUpsertInput, value: PMTemplateUpsertInput[keyof PMTemplateUpsertInput]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload: PMTemplateUpsertInput = {
      ...form,
      tasks: (form.tasks ?? []).map((task) => task.trim()).filter(Boolean),
      estimatedMinutes: form.estimatedMinutes ? Number(form.estimatedMinutes) : undefined,
    };

    if (!payload.name || !payload.category) return;

    if (isEditing && templateId) {
      await updateMutation.mutateAsync({ templateId, payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    navigate("/pm/templates");
  };

  if (isEditing && templateQuery.isLoading) {
    return <div className="p-6 text-sm text-neutral-600">Loading template...</div>;
  }

  if (isEditing && templateQuery.isError) {
    return <div className="p-6 text-sm text-error-500">Failed to load template.</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">{isEditing ? "Edit template" : "New template"}</h1>
          <p className="text-sm text-neutral-600">
            Define the core details and tasks for your preventive maintenance template.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/pm/templates")}>Back to list</Button>
      </div>

      <Card className="max-w-4xl space-y-6 p-6">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-neutral-800">Name</label>
              <Input
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Example: Monthly safety inspection"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-neutral-800">Category</label>
              <Input
                value={form.category}
                onChange={(e) => handleChange("category", e.target.value)}
                placeholder="Inspection"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-neutral-800">Description</label>
            <TextArea
              value={form.description ?? ""}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange("description", e.target.value)}
              placeholder="Describe the scope and safety steps for this template"
              rows={4}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-neutral-800">Estimated minutes</label>
              <Input
                type="number"
                min={1}
                value={form.estimatedMinutes ?? ""}
                onChange={(e) => handleChange("estimatedMinutes", Number(e.target.value) || undefined)}
                placeholder="60"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-neutral-800">Tasks</label>
              <TaskList tasks={form.tasks ?? [""]} onChange={(tasks) => handleChange("tasks", tasks)} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" loading={createMutation.isLoading || updateMutation.isLoading}>
              {isEditing ? "Save changes" : "Create template"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => navigate("/pm/templates")}>Cancel</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
