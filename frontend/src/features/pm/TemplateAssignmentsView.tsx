/*
 * SPDX-License-Identifier: MIT
 */

import { useMemo, useState } from 'react';

import Button from '@/components/common/Button';
import type { PMTemplate, PMTemplateAssignment } from '@/types';
import AssignmentForm from './AssignmentForm';
import {
  useAssetOptions,
  useDeleteAssignment,
  useInventorySelectOptions,
  usePmTemplates,
  useTemplateById,
} from './hooks';

const TemplateAssignmentsView = () => {
  const { data: templates, isLoading, isError } = usePmTemplates();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>();
  const [editingAssignment, setEditingAssignment] = useState<PMTemplateAssignment | null>(null);
  const { assets } = useAssetOptions();
  const { options: partOptions } = useInventorySelectOptions();
  const deleteMutation = useDeleteAssignment();

  const resolvedTemplate = useTemplateById(templates, selectedTemplateId) ?? templates?.[0];

  const templateAssignments = useMemo(() => resolvedTemplate?.assignments ?? [], [resolvedTemplate]);

  const handleTemplateSelect = (template: PMTemplate) => {
    setSelectedTemplateId(template.id);
    setEditingAssignment(null);
  };

  const handleEdit = (assignment: PMTemplateAssignment) => {
    setEditingAssignment(assignment);
  };

  const handleDelete = async (assignmentId: string) => {
    if (!resolvedTemplate) return;
    try {
      await deleteMutation.mutateAsync({ templateId: resolvedTemplate.id, assignmentId });
    } catch (error) {
      console.error(error);
    }
  };

  const handleFormSuccess = () => {
    setEditingAssignment(null);
  };

  return (
    <div className="grid gap-6 p-6 lg:grid-cols-[280px,1fr]">
      <aside className="rounded-lg border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-4 py-3">
          <p className="text-sm font-semibold text-neutral-800">PM templates</p>
          <p className="text-xs text-neutral-500">Select a template to review assignments.</p>
        </div>
        <div className="divide-y divide-neutral-100">
          {isLoading && <p className="px-4 py-3 text-sm text-neutral-500">Loading templates...</p>}
          {isError && <p className="px-4 py-3 text-sm text-error-500">Failed to load templates</p>}
          {!isLoading && !isError && templates?.length === 0 && (
            <p className="px-4 py-3 text-sm text-neutral-500">No templates available.</p>
          )}
          {(templates ?? []).map((template) => {
            const isActive = resolvedTemplate?.id === template.id;
            return (
              <button
                key={template.id}
                className={`flex w-full flex-col items-start px-4 py-3 text-left text-sm ${
                  isActive ? 'bg-primary-50 text-primary-700' : 'text-neutral-700 hover:bg-neutral-50'
                }`}
                onClick={() => handleTemplateSelect(template)}
              >
                <span className="font-medium">{template.name}</span>
                <span className="text-xs text-neutral-500">{template.assignments.length} assignment(s)</span>
              </button>
            );
          })}
        </div>
      </aside>
      <section className="space-y-6">
        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          {resolvedTemplate ? (
            <>
              <div className="flex flex-col gap-2 border-b border-neutral-100 pb-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">{resolvedTemplate.name}</h2>
                  {resolvedTemplate.description && (
                    <p className="text-sm text-neutral-500">{resolvedTemplate.description}</p>
                  )}
                </div>
                <Button variant="outline" onClick={() => setEditingAssignment(null)}>
                  Add assignment
                </Button>
              </div>
              <ul className="divide-y divide-neutral-100">
                {templateAssignments.map((assignment) => (
                  <li key={assignment.id} className="flex flex-col gap-2 py-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-medium text-neutral-800">{assignment.assetName ?? 'Unresolved asset'}</p>
                      <p className="text-sm text-neutral-500">
                        {assignment.usageMetric
                          ? `Meter trigger: +${assignment.usageTarget ?? '–'}`
                          : `Interval: ${assignment.interval ?? 'Not set'}${assignment.nextDue ? ` · Next due ${new Date(assignment.nextDue).toLocaleDateString()}` : ''}`}
                      </p>
                      {assignment.procedureTemplateName && (
                        <p className="text-xs text-neutral-500">
                          Procedure: {assignment.procedureTemplateName}
                        </p>
                      )}
                      <p className="text-xs text-neutral-500">
                        Checklist items: {assignment.checklist.length} · Parts: {assignment.requiredParts.length}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(assignment)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(assignment.id)}
                        loading={deleteMutation.isLoading && deleteMutation.variables?.assignmentId === assignment.id}
                      >
                        Remove
                      </Button>
                    </div>
                  </li>
                ))}
                {templateAssignments.length === 0 && (
                  <li className="py-4 text-sm text-neutral-500">No assets linked yet.</li>
                )}
              </ul>
            </>
          ) : (
            <p className="text-sm text-neutral-500">Select a template to get started.</p>
          )}
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-base font-semibold text-neutral-900">
            {editingAssignment ? 'Edit assignment' : 'New assignment'}
          </h3>
          {resolvedTemplate ? (
            <AssignmentForm
              templateId={resolvedTemplate.id}
              assignment={editingAssignment}
              assets={assets}
              partOptions={partOptions}
              onSuccess={handleFormSuccess}
            />
          ) : (
            <p className="text-sm text-neutral-500">Choose a template to manage its assignments.</p>
          )}
        </div>
      </section>
    </div>
  );
};

export default TemplateAssignmentsView;
