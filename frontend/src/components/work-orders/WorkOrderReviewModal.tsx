/*
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import Button from '@/components/common/Button';
import type { WorkOrder } from '@/types';
import { useAuthStore, isAdmin as selectIsAdmin, isSupervisor as selectIsSupervisor } from '@/store/authStore';
import FailureInsightCard from '@/components/ai/FailureInsightCard';
import { useFailurePrediction } from '@/hooks/useAiInsights';
import CopilotPanel, { type CopilotSuggestion } from '@/workorders/CopilotPanel';
import http from '@/lib/http';

interface Props {
  isOpen: boolean;
  workOrder: WorkOrder | null;
  onClose: () => void;
  onUpdateStatus: (status: WorkOrder['status']) => void;
  onWorkOrderChange?: (workOrder: WorkOrder) => void;
}

const statusOptions: WorkOrder['status'][] = [
  'requested',
  'assigned',
  'in_progress',
  'paused',
  'completed',
  'cancelled',
];

const WorkOrderReviewModal: React.FC<Props> = ({
  isOpen,
  workOrder,
  onClose,
  onUpdateStatus,
  onWorkOrderChange,
}) => {
  const isAdmin = useAuthStore(selectIsAdmin);
  const isSupervisor = useAuthStore(selectIsSupervisor);
  const [status, setStatus] = useState<WorkOrder['status']>('requested');
  const [currentOrder, setCurrentOrder] = useState<WorkOrder | null>(workOrder);
  const aiPrediction = useFailurePrediction({
    workOrderId: currentOrder?.id,
    assetId: currentOrder?.assetId,
  });


  useEffect(() => {
    setCurrentOrder(workOrder);
  }, [workOrder]);

  useEffect(() => {
    setStatus(currentOrder?.status || 'requested');
  }, [currentOrder]);

  if (!isOpen || !currentOrder) return null;

  const mergeFailureModes = (existing: string[] = [], incoming: string[] = []): string[] => {
    const seen = new Map(existing.map((tag) => [tag.toLowerCase(), tag]));
    const result = [...existing];
    incoming.forEach((tag) => {
      const slug = tag.toLowerCase();
      if (!seen.has(slug)) {
        seen.set(slug, tag);
        result.push(tag);
      }
    });
    return result;
  };

  const handleApplySuggestion = async (suggestion: CopilotSuggestion): Promise<void> => {
    if (!currentOrder) return;
    const nextDescription = [currentOrder.description ?? '', suggestion.detail]
      .filter((text) => Boolean(text && text.trim().length))
      .join('\n\n')
      .trim();
    const mergedTags = suggestion.failureModes?.length
      ? mergeFailureModes(currentOrder.failureModeTags ?? [], suggestion.failureModes)
      : currentOrder.failureModeTags ?? [];
    const payload: Record<string, unknown> = {};
    if (nextDescription && nextDescription !== currentOrder.description) {
      payload.description = nextDescription;
    }
    if (
      suggestion.failureModes?.length &&
      mergedTags.length !== (currentOrder.failureModeTags ?? []).length
    ) {
      payload.failureModeTags = mergedTags;
    }
    if (!Object.keys(payload).length) {
      return;
    }
    await http.put(`/workorders/${currentOrder.id}`, payload);
    const updated: WorkOrder = {
      ...currentOrder,
      ...(payload.description ? { description: payload.description as string } : {}),
      ...(payload.failureModeTags ? { failureModeTags: payload.failureModeTags as string[] } : {}),
    };
    setCurrentOrder(updated);
    onWorkOrderChange?.(updated);
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-y-auto"
        onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-neutral-200">
          <h2 className="text-lg font-semibold text-neutral-900">
            Work Order Details
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-700"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <span className="font-medium">Department:</span>{' '}
            {currentOrder.department || 'N/A'}
          </div>
          <div>
            <span className="font-medium">Title:</span> {currentOrder.title}
          </div>
          <div>
            <span className="font-medium">Priority:</span> {currentOrder.priority}
          </div>
          <div>
            <span className="font-medium">Type:</span> {currentOrder.type}
          </div>
          {(currentOrder.complianceProcedureId || currentOrder.calibrationIntervalDays) && (
            <div className="space-y-1">
              {currentOrder.complianceProcedureId && (
                <div>
                  <span className="font-medium">Procedure ID:</span>{' '}
                  {currentOrder.complianceProcedureId}
                </div>
              )}
              {currentOrder.calibrationIntervalDays && (
                <div>
                  <span className="font-medium">Calibration Interval:</span>{' '}
                  {currentOrder.calibrationIntervalDays} days
                </div>
              )}
            </div>
          )}
          <div>
            <span className="font-medium">Description:</span>{' '}
            {currentOrder.description || 'N/A'}
          </div>
          <div>
            <span className="font-medium">Scheduled Date:</span>{' '}
            {currentOrder.scheduledDate
              ? new Date(currentOrder.scheduledDate).toLocaleDateString()
              : 'N/A'}
          </div>
          <div>
            <span className="font-medium">Status:</span>{' '}
            {isAdmin || isSupervisor ? (
              <select
                className="ml-2 border border-neutral-300 rounded-md px-2 py-1"
                value={status}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatus(e.target.value as WorkOrder['status'])}
              >
                {statusOptions.map((s: WorkOrder['status']) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            ) : (
              <span className="ml-1">{currentOrder.status}</span>
            )}
          </div>
          <div>
            <span className="font-medium">Assignees:</span>{' '}
            {currentOrder.assignees && currentOrder.assignees.length > 0
              ? currentOrder.assignees.join(', ')
              : 'N/A'}
          </div>
          {currentOrder.timeSpentMin !== undefined && (
            <div>
              <span className="font-medium">Time Spent (min):</span> {currentOrder.timeSpentMin}
            </div>
          )}
          {currentOrder.failureCode && (
            <div>
              <span className="font-medium">Failure Code:</span> {currentOrder.failureCode}
            </div>
          )}
          {currentOrder.failureModeTags && currentOrder.failureModeTags.length > 0 && (
            <div>
              <span className="font-medium">Failure Modes:</span>
              <div className="mt-1 flex flex-wrap gap-2">
                {currentOrder.failureModeTags.map((tag) => (
                  <span key={tag} className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
          {currentOrder.checklists && currentOrder.checklists.length > 0 && (
            <div>
              <div className="font-medium mb-1">Checklists</div>
              <ul className="list-disc list-inside space-y-1">
                {currentOrder.checklists?.map((c, idx) => (
                  <li key={idx}>
                    {c.text} {c.done ? '✔' : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {currentOrder.partsUsed && currentOrder.partsUsed.length > 0 && (
            <div>
              <div className="font-medium mb-1">Parts Used</div>
              <ul className="list-disc list-inside space-y-1">
                {currentOrder.partsUsed.map((p, idx) => (
                  <li key={idx}>
                    {p.partId} x{p.qty} (${p.cost})
                  </li>
                ))}
              </ul>
            </div>
          )}
          {currentOrder.photos && currentOrder.photos.length > 0 && (
            <div>
              <div className="font-medium mb-1">Photos</div>
              <div className="flex flex-wrap gap-2">
                {currentOrder.photos.map((p, idx) => (
                  <img
                    key={idx}
                    src={p}
                    alt={`Photo ${idx + 1}`}
                    className="h-20 w-20 object-cover rounded"
                  />
                ))}
              </div>
            </div>
          )}
          {currentOrder.attachments && currentOrder.attachments.length > 0 && (
            <div>
              <div className="font-medium mb-1">Attachments</div>
              <ul className="list-disc list-inside space-y-1">
                {currentOrder.attachments.map((att: any, idx: number) => (
                  <li key={att.id || idx}>
                    {att.url ? (
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 underline"
                      >
                        {att.name || `Attachment ${idx + 1}`}
                      </a>
                    ) : (
                      att.name || `Attachment ${idx + 1}`
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {currentOrder.signatures && currentOrder.signatures.length > 0 && (
            <div>
              <div className="font-medium mb-1">Signatures</div>
              <ul className="list-disc list-inside space-y-1">
                {currentOrder.signatures.map((s, idx) => (
                  <li key={idx}>
                    {s.by} - {new Date(s.ts).toLocaleString()}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <FailureInsightCard
            title="AI maintenance insights"
            insight={aiPrediction.data}
            loading={aiPrediction.isLoading}
            error={aiPrediction.error}
            onRetry={() => aiPrediction.refetch()}
          />
          <CopilotPanel
            workOrderId={currentOrder.id}
            assetId={currentOrder.assetId}
            initialSummary={currentOrder.copilotSummary}
            initialTags={currentOrder.failureModeTags}
            onApplySuggestion={handleApplySuggestion}
          />
        </div>
        {(isAdmin || isSupervisor) && (
          <div className="flex justify-end space-x-3 p-4 border-t border-neutral-200">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button
              variant="primary"
              onClick={() => onUpdateStatus(status)}
            >
              Update Status
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkOrderReviewModal;
