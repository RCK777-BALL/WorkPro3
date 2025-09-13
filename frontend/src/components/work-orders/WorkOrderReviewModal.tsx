/*
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import Button from '@common/Button';
import type { WorkOrder } from '@/types';
import { useAuthStore, isAdmin as selectIsAdmin, isManager as selectIsManager } from '@/store/authStore';
import AICopilot from '@/workorders/AICopilot';

interface Props {
  isOpen: boolean;
  workOrder: WorkOrder | null;
  onClose: () => void;
  onUpdateStatus: (status: WorkOrder['status']) => void;
}

const statusOptions: WorkOrder['status'][] = [
  'requested',
  'assigned',
  'in_progress',
  'completed',
  'cancelled',
];

const WorkOrderReviewModal: React.FC<Props> = ({
  isOpen,
  workOrder,
  onClose,
  onUpdateStatus,
}) => {
  const isAdmin = useAuthStore(selectIsAdmin);
  const isManager = useAuthStore(selectIsManager);
  const [status, setStatus] = useState<WorkOrder['status']>('requested');

  useEffect(() => {
    setStatus(workOrder?.status || 'requested');
  }, [workOrder]);

  if (!isOpen || !workOrder) return null;

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
            {workOrder.department || 'N/A'}
          </div>
          <div>
            <span className="font-medium">Title:</span> {workOrder.title}
          </div>
          <div>
            <span className="font-medium">Priority:</span> {workOrder.priority}
          </div>
          <div>
            <span className="font-medium">Description:</span>{' '}
            {workOrder.description || 'N/A'}
          </div>
          <div>
            <span className="font-medium">Scheduled Date:</span>{' '}
            {workOrder.scheduledDate
              ? new Date(workOrder.scheduledDate).toLocaleDateString()
              : 'N/A'}
          </div>
          <div>
            <span className="font-medium">Status:</span>{' '}
            {isAdmin || isManager ? (
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
              <span className="ml-1">{workOrder.status}</span>
            )}
          </div>
          <div>
            <span className="font-medium">Assignees:</span>{' '}
            {workOrder.assignees && workOrder.assignees.length > 0
              ? workOrder.assignees.join(', ')
              : 'N/A'}
          </div>
          {workOrder.timeSpentMin !== undefined && (
            <div>
              <span className="font-medium">Time Spent (min):</span> {workOrder.timeSpentMin}
            </div>
          )}
          {workOrder.failureCode && (
            <div>
              <span className="font-medium">Failure Code:</span> {workOrder.failureCode}
            </div>
          )}
          {workOrder.checklists && workOrder.checklists.length > 0 && (
            <div>
              <div className="font-medium mb-1">Checklists</div>
              <ul className="list-disc list-inside space-y-1">
                {workOrder.checklists.map((c, idx) => (
                  <li key={idx}>{c}</li>
                ))}
              </ul>
            </div>
          )}
          {workOrder.partsUsed && workOrder.partsUsed.length > 0 && (
            <div>
              <div className="font-medium mb-1">Parts Used</div>
              <ul className="list-disc list-inside space-y-1">
                {workOrder.partsUsed.map((p, idx) => (
                  <li key={idx}>{p}</li>
                ))}
              </ul>
            </div>
          )}
          {workOrder.photos && workOrder.photos.length > 0 && (
            <div>
              <div className="font-medium mb-1">Photos</div>
              <div className="flex flex-wrap gap-2">
                {workOrder.photos.map((p, idx) => (
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
          {workOrder.attachments && workOrder.attachments.length > 0 && (
            <div>
              <div className="font-medium mb-1">Attachments</div>
              <ul className="list-disc list-inside space-y-1">
                {workOrder.attachments.map((att: any, idx: number) => (
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
          {workOrder.signature && (
            <div>
              <div className="font-medium mb-1">Signature</div>
              <img
                src={workOrder.signature}
                alt="Signature"
                className="border rounded-md max-h-40"
              />
            </div>
          )}
          <AICopilot workOrderId={workOrder.id} />
        </div>
        {(isAdmin || isManager) && (
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
