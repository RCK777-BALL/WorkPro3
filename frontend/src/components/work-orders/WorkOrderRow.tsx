/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';
import Badge from '@/common/Badge';
import Avatar from '@/common/Avatar';
import Button from '@/common/Button';
import { MoreVertical, GripVertical, Box } from 'lucide-react';
import type { WorkOrder } from '@/types';

interface WorkOrderRowProps {
  workOrder: WorkOrder;
  onClick: () => void;
}

export const WorkOrderRow: React.FC<WorkOrderRowProps> = ({ workOrder, onClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: workOrder.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="hover:bg-neutral-50 transition-colors duration-150"
      {...attributes}
    >
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <button
            className="mr-3 text-neutral-400 hover:text-neutral-600 cursor-grab active:cursor-grabbing"
            {...listeners}
          >
            <GripVertical size={16} />
          </button>
          <Badge
            text={workOrder.priority}
            type="priority"
            size="sm"
          />
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="text-sm font-medium text-neutral-900">{workOrder.id}</span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10">
            {workOrder.asset?.image ? (
              <img
                className="h-10 w-10 rounded-lg object-cover"
                src={workOrder.asset.image}
                alt={workOrder.asset?.name || 'Asset'}
              />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-neutral-100 flex items-center justify-center">
                <span className="text-neutral-500 text-sm font-medium">
                  {workOrder.asset?.name ? workOrder.asset.name.substring(0, 2).toUpperCase() : <Box size={20} />}
                </span>
              </div>
            )}
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-neutral-900">
              {workOrder.asset?.name || 'Unknown Asset'}
            </div>
            <div className="text-sm text-neutral-500">
              {workOrder.asset?.location || 'No location'}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <Badge
          text={workOrder.status}
          type="status"
          size="sm"
        />
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="text-sm text-neutral-500">{workOrder.type}</span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="text-sm text-neutral-500">
          {format(new Date(workOrder.scheduledDate || ''), 'MMM d, yyyy')}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {workOrder.assignedTo ? (
          <div className="flex items-center">
            <Avatar
              name={workOrder.assignedTo}
              size="sm"
              src={workOrder.assignedToAvatar}
            />
            <span className="ml-2 text-sm text-neutral-900">
              {workOrder.assignedTo}
            </span>
          </div>
        ) : (
          <span className="text-sm text-neutral-500">Unassigned</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <Button
          variant="ghost"
          size="sm"
          icon={<MoreVertical size={16} />}
          onClick={onClick}
        />
      </td>
    </tr>
  );
};
