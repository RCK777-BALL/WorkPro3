/*
 * SPDX-License-Identifier: MIT
 */

import type { WorkOrder } from '@/types';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';

export type WorkOrderAction = 'assign' | 'start' | 'complete' | 'cancel';

interface WorkOrderMobileCardProps {
  order: WorkOrder;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTransition: (action: WorkOrderAction) => void;
}

const WorkOrderMobileCard = ({ order, onView, onEdit, onDelete, onTransition }: WorkOrderMobileCardProps) => {
  const renderActions = () => {
    switch (order.status) {
      case 'requested':
        return (
          <>
            <Button size="sm" variant="outline" onClick={onView}>
              View
            </Button>
            <Button size="sm" variant="outline" onClick={onEdit}>
              Edit
            </Button>
            <Button size="sm" variant="outline" onClick={() => onTransition('assign')}>
              Assign
            </Button>
            <Button size="sm" variant="destructive" onClick={onDelete}>
              Delete
            </Button>
          </>
        );
      case 'assigned':
        return (
          <>
            <Button size="sm" variant="outline" onClick={onView}>
              View
            </Button>
            <Button size="sm" variant="outline" onClick={onEdit}>
              Edit
            </Button>
            <Button size="sm" variant="outline" onClick={() => onTransition('start')}>
              Start
            </Button>
            <Button size="sm" variant="destructive" onClick={onDelete}>
              Delete
            </Button>
          </>
        );
      case 'in_progress':
        return (
          <>
            <Button size="sm" variant="outline" onClick={onView}>
              View
            </Button>
            <Button size="sm" variant="outline" onClick={onEdit}>
              Edit
            </Button>
            <Button size="sm" variant="outline" onClick={() => onTransition('complete')}>
              Complete
            </Button>
            <Button size="sm" variant="outline" onClick={() => onTransition('cancel')}>
              Cancel
            </Button>
            <Button size="sm" variant="destructive" onClick={onDelete}>
              Delete
            </Button>
          </>
        );
      case 'paused':
        return (
          <>
            <Button size="sm" variant="outline" onClick={onView}>
              View
            </Button>
            <Button size="sm" variant="outline" onClick={onEdit}>
              Edit
            </Button>
            <Button size="sm" variant="outline" onClick={() => onTransition('start')}>
              Resume
            </Button>
            <Button size="sm" variant="outline" onClick={() => onTransition('complete')}>
              Complete
            </Button>
            <Button size="sm" variant="outline" onClick={() => onTransition('cancel')}>
              Cancel
            </Button>
            <Button size="sm" variant="destructive" onClick={onDelete}>
              Delete
            </Button>
          </>
        );
      default:
        return (
          <>
            <Button size="sm" variant="outline" onClick={onView}>
              View
            </Button>
            <Button size="sm" variant="outline" onClick={onEdit}>
              Edit
            </Button>
            <Button size="sm" variant="destructive" onClick={onDelete}>
              Delete
            </Button>
          </>
        );
    }
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-neutral-500">Work order</p>
          <h3 className="truncate text-base font-semibold text-neutral-900">{order.title}</h3>
          <p className="mt-1 text-xs text-neutral-500">
            {order.department ?? 'General'} · {order.type ?? 'corrective'}
          </p>
        </div>
        <Badge text={order.priority} type="priority" size="sm" />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge text={order.status} type="status" size="sm" />
        {order.assignees?.length ? (
          <Badge text={`Assignees: ${order.assignees.join(', ')}`} size="sm" />
        ) : (
          <Badge text="Unassigned" size="sm" />
        )}
        <Badge
          text={`Due: ${order.dueDate ? new Date(order.dueDate).toLocaleDateString() : 'N/A'}`}
          size="sm"
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">{renderActions()}</div>
    </div>
  );
};

export default WorkOrderMobileCard;
