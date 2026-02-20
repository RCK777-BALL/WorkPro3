/*
 * SPDX-License-Identifier: MIT
 */

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import Input from '@/components/common/Input';
import TextArea from '@/components/common/TextArea';
import { useToast } from '@/context/ToastContext';
import {
  createProcedureTemplate,
  createProcedureVersion,
  fetchProcedureTemplates,
  fetchProcedureVersions,
  publishProcedureVersion,
} from '@/api/pmProcedures';
import type { ProcedureTemplateSummary, ProcedureTemplateVersion } from '@/types';

const templateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  description: z.string().optional(),
  category: z.string().optional(),
});

const versionSchema = z.object({
  durationMinutes: z.number().int().positive('Duration must be at least 1 minute'),
  safetySteps: z.array(z.string().min(1)).min(1, 'Add at least one safety step'),
  steps: z.array(z.string().min(1)).optional(),
  notes: z.string().optional(),
});

const ProcedureTemplateBuilder = () => {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { data: templates = [] } = useQuery({
    queryKey: ['pm', 'procedures'],
    queryFn: fetchProcedureTemplates,
  });
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>();
  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? templates[0],
    [templates, selectedTemplateId],
  );

  const { data: versions = [] } = useQuery({
    queryKey: ['pm', 'procedure-versions', selectedTemplate?.id],
    queryFn: () => fetchProcedureVersions(selectedTemplate?.id ?? ''),
    enabled: Boolean(selectedTemplate?.id),
  });

  const [templateForm, setTemplateForm] = useState({ name: '', description: '', category: '' });
  const [versionForm, setVersionForm] = useState({
    durationMinutes: 30,
    safetySteps: '',
    steps: '',
    notes: '',
  });
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [versionError, setVersionError] = useState<string | null>(null);

  const createTemplateMutation = useMutation({
    mutationFn: createProcedureTemplate,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['pm', 'procedures'] });
      setTemplateForm({ name: '', description: '', category: '' });
      addToast('Procedure template created', 'success');
    },
  });

  const createVersionMutation = useMutation({
    mutationFn: (payload: Parameters<typeof createProcedureVersion>[1]) =>
      createProcedureVersion(selectedTemplate?.id ?? '', payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['pm', 'procedure-versions', selectedTemplate?.id] });
      setVersionForm({ durationMinutes: 30, safetySteps: '', steps: '', notes: '' });
      addToast('Draft version created', 'success');
    },
  });

  const publishMutation = useMutation({
    mutationFn: (versionId: string) => publishProcedureVersion(versionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['pm', 'procedure-versions', selectedTemplate?.id] });
      await queryClient.invalidateQueries({ queryKey: ['pm', 'procedures'] });
      addToast('Version published', 'success');
    },
  });

  const handleCreateTemplate = async () => {
    const result = templateSchema.safeParse({
      name: templateForm.name.trim(),
      description: templateForm.description.trim() || undefined,
      category: templateForm.category.trim() || undefined,
    });
    if (!result.success) {
      setTemplateError(result.error.issues[0]?.message ?? 'Invalid template input');
      return;
    }
    setTemplateError(null);
    await createTemplateMutation.mutateAsync(result.data);
  };

  const handleCreateVersion = async () => {
    if (!selectedTemplate?.id) {
      setVersionError('Select a template first.');
      return;
    }
    const result = versionSchema.safeParse({
      durationMinutes: Number(versionForm.durationMinutes),
      safetySteps: versionForm.safetySteps
        .split('\n')
        .map((step) => step.trim())
        .filter(Boolean),
      steps: versionForm.steps
        .split('\n')
        .map((step) => step.trim())
        .filter(Boolean),
      notes: versionForm.notes.trim() || undefined,
    });
    if (!result.success) {
      setVersionError(result.error.issues[0]?.message ?? 'Invalid version input');
      return;
    }
    setVersionError(null);
    await createVersionMutation.mutateAsync(result.data);
  };

  return (
    <div className="grid gap-6 p-6 lg:grid-cols-[260px,1fr]">
      <Card className="p-4">
        <h2 className="text-lg font-semibold text-neutral-900">Templates</h2>
        <p className="text-sm text-neutral-500">Select a procedure template to manage versions.</p>
        <div className="mt-4 space-y-2">
          {(templates as ProcedureTemplateSummary[]).map((template) => (
            <button
              key={template.id}
              className={`w-full rounded-md px-3 py-2 text-left text-sm ${
                selectedTemplate?.id === template.id
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-neutral-700 hover:bg-neutral-50'
              }`}
              onClick={() => setSelectedTemplateId(template.id)}
            >
              <p className="font-medium">{template.name}</p>
              <p className="text-xs text-neutral-500">
                Latest version: {template.latestVersionNumber ?? '—'}
              </p>
            </button>
          ))}
          {templates.length === 0 && <p className="text-sm text-neutral-500">No templates yet.</p>}
        </div>
      </Card>

      <div className="space-y-6">
        <Card className="p-4">
          <h3 className="text-base font-semibold text-neutral-900">Create procedure template</h3>
          {templateError && <p className="text-sm text-error-500">{templateError}</p>}
          <div className="mt-3 space-y-3">
            <Input
              label="Template name"
              value={templateForm.name}
              onChange={(event) => setTemplateForm((prev) => ({ ...prev, name: event.target.value }))}
            />
            <Input
              label="Category (optional)"
              value={templateForm.category}
              onChange={(event) => setTemplateForm((prev) => ({ ...prev, category: event.target.value }))}
            />
            <TextArea
              label="Description"
              rows={3}
              value={templateForm.description}
              onChange={(event) => setTemplateForm((prev) => ({ ...prev, description: event.target.value }))}
            />
            <Button onClick={handleCreateTemplate} loading={createTemplateMutation.isPending}>
              Create template
            </Button>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-base font-semibold text-neutral-900">Create new version</h3>
          {versionError && <p className="text-sm text-error-500">{versionError}</p>}
          <div className="mt-3 space-y-3">
            <Input
              label="Duration (minutes)"
              type="number"
              value={versionForm.durationMinutes}
              onChange={(event) => setVersionForm((prev) => ({ ...prev, durationMinutes: Number(event.target.value) }))}
            />
            <TextArea
              label="Safety steps (one per line)"
              rows={3}
              value={versionForm.safetySteps}
              onChange={(event) => setVersionForm((prev) => ({ ...prev, safetySteps: event.target.value }))}
            />
            <TextArea
              label="Procedure steps (one per line)"
              rows={4}
              value={versionForm.steps}
              onChange={(event) => setVersionForm((prev) => ({ ...prev, steps: event.target.value }))}
            />
            <TextArea
              label="Notes"
              rows={2}
              value={versionForm.notes}
              onChange={(event) => setVersionForm((prev) => ({ ...prev, notes: event.target.value }))}
            />
            <Button
              onClick={handleCreateVersion}
              loading={createVersionMutation.isPending}
              disabled={!selectedTemplate?.id}
            >
              Create draft version
            </Button>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-base font-semibold text-neutral-900">Versions</h3>
          <div className="mt-3 space-y-3">
            {(versions as ProcedureTemplateVersion[]).map((version) => (
              <div key={version.id} className="rounded-md border border-neutral-200 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-neutral-800">
                      v{version.versionNumber} · {version.status}
                    </p>
                    <p className="text-xs text-neutral-500">Duration: {version.durationMinutes} min</p>
                  </div>
                  {version.status === 'draft' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => publishMutation.mutate(version.id)}
                      loading={publishMutation.isPending && publishMutation.variables === version.id}
                    >
                      Publish
                    </Button>
                  )}
                </div>
                <ul className="mt-2 list-disc pl-5 text-xs text-neutral-600">
                  {version.safetySteps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
              </div>
            ))}
            {versions.length === 0 && (
              <p className="text-sm text-neutral-500">No versions yet. Create a draft above.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ProcedureTemplateBuilder;

