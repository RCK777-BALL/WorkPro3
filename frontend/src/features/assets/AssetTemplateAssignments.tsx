/*
 * SPDX-License-Identifier: MIT
 */

import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import Button from '@/components/common/Button';
import { useToast } from '@/context/ToastContext';
import { useDeleteAssignment, usePmTemplates, useInventorySelectOptions } from '@/features/pm/hooks';
import AssignmentForm from '@/features/pm/AssignmentForm';
import type { AssetDetailResponse } from '@/api/hierarchy';

type AssetTemplateAssignmentsProps = {
  asset: AssetDetailResponse['asset'];
};

const AssetTemplateAssignments = ({ asset }: AssetTemplateAssignmentsProps) => {
  const { data: templates, isLoading } = usePmTemplates();
  const { options: partOptions } = useInventorySelectOptions();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>();
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const deleteMutation = useDeleteAssignment();
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const assignments = useMemo(
    () =>
      (templates ?? [])
        .flatMap((template) =>
          template.assignments
            .filter((assignment) => assignment.assetId === asset.id)
            .map((assignment) => ({ template, assignment })),
        )
        .sort((a, b) => a.template.name.localeCompare(b.template.name)),
    [asset.id, templates],
  );

  const selectedTemplate = useMemo(() => {
    if (selectedTemplateId) {
      return templates?.find((template) => template.id === selectedTemplateId);
    }
    return templates?.find((template) => template.assignments.some((assignment) => assignment.assetId === asset.id))
      ?? templates?.[0];
  }, [asset.id, selectedTemplateId, templates]);

  const editingAssignment = useMemo(
    () => assignments.find((entry) => entry.assignment.id === editingAssignmentId),
    [assignments, editingAssignmentId],
  );

  const assets = useMemo(() => [{ id: asset.id, name: asset.name }], [asset.id, asset.name]);

  const handleDelete = async (templateId: string, assignmentId: string) => {
    try {
      await deleteMutation.mutateAsync({ templateId, assignmentId });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['hierarchy', 'asset', asset.id] }),
        queryClient.invalidateQueries({ queryKey: ['pm', 'templates'] }),
      ]);
    } catch (err) {
      console.error(err);
      addToast('Failed to remove assignment', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-200">PM Template Assignments</h3>
        <div className="flex items-center gap-2">
          <select
            className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1 text-sm text-white"
            value={selectedTemplate?.id ?? ''}
            onChange={(event) => setSelectedTemplateId(event.target.value)}
          >
            {(templates ?? []).map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
            {!templates?.length && <option value="">No templates available</option>}
          </select>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditingAssignmentId(null)}
            disabled={!selectedTemplate}
          >
            Assign template
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {isLoading && <p className="text-sm text-neutral-500">Loading templates...</p>}
        {!isLoading && assignments.length === 0 && (
          <p className="text-sm text-neutral-500">No templates linked to this asset yet.</p>
        )}
        {assignments.map(({ template, assignment }) => (
          <div
            key={assignment.id}
            className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-3 text-sm text-neutral-200"
          >
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold text-white">{template.name}</p>
                <p className="text-xs text-neutral-400">
                  Interval: {assignment.interval}{' '}
                  {assignment.nextDue ? `· Next due ${new Date(assignment.nextDue).toLocaleDateString()}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="xs" variant="ghost" onClick={() => setEditingAssignmentId(assignment.id)}>
                  Edit
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  loading={deleteMutation.isPending && deleteMutation.variables?.assignmentId === assignment.id}
                  onClick={() => handleDelete(template.id, assignment.id)}
                >
                  Remove
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedTemplate && (
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-4">
          <h4 className="mb-2 text-sm font-semibold text-white">
            {editingAssignment ? 'Edit assignment' : 'Create assignment'}
          </h4>
          <AssignmentForm
            templateId={selectedTemplate.id}
            assignment={editingAssignment?.assignment}
            assets={assets}
            partOptions={partOptions}
            onSuccess={() => {
              setEditingAssignmentId(null);
              void queryClient.invalidateQueries({ queryKey: ['hierarchy', 'asset', asset.id] });
            }}
            fixedAssetId={asset.id}
          />
        </div>
      )}
    </div>
  );
};

export default AssetTemplateAssignments;


