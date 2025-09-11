/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { WorkOrderRow } from './WorkOrderRow';
import Badge from '@/common/Badge';
import type { WorkOrder } from '@/types';

interface WorkOrderTableProps {
  workOrders: WorkOrder[];
  search: string;
  onRowClick: (order: WorkOrder) => void;
  onReorder: (reorderedWorkOrders: WorkOrder[]) => void;
}

const WorkOrderTable: React.FC<WorkOrderTableProps> = ({
  workOrders,
  search,
  onRowClick,
  onReorder,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const filteredOrders = workOrders.filter((order) =>
    Object.values(order).some((value) =>
      String(value).toLowerCase().includes(search.toLowerCase())
    )
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = workOrders.findIndex((order) => order.id === active.id);
      const newIndex = workOrders.findIndex((order) => order.id === over.id);

      const reorderedWorkOrders = [...workOrders];
      const [movedOrder] = reorderedWorkOrders.splice(oldIndex, 1);
      reorderedWorkOrders.splice(newIndex, 0, movedOrder);

      onReorder(reorderedWorkOrders);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-200">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Priority
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Asset
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Due Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Assigned To
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-neutral-200">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={filteredOrders.map((order) => order.id)}
                strategy={verticalListSortingStrategy}
              >
                {filteredOrders.map((order) => (
                  <WorkOrderRow
                    key={order.id}
                    workOrder={order}
                    onClick={() => onRowClick(order)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </tbody>
        </table>
      </div>
      
      {filteredOrders.length === 0 && (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neutral-100 mb-4">
            <svg className="h-8 w-8 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-neutral-500">No work orders found</p>
        </div>
      )}
    </div>
  );
};

export default WorkOrderTable;
