/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import Badge from '@/components/common/Badge';
import { Package } from 'lucide-react';
import type { Part } from '@/types';

interface InventoryTableProps {
  parts: Part[];
  onRowClick: (part: Part) => void;
  onAdjust: (part: Part) => void;
  onEdit: (part: Part) => void;
  onDuplicate: (part: Part) => void;
}

const InventoryTable: React.FC<InventoryTableProps> = ({
  parts,
  onRowClick,
  onAdjust,
  onEdit,
  onDuplicate,
}) => {

  const formatCurrency = (amount?: number) => {
    if (amount == null) {
      return '—';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStockStatus = (quantity: number, reorderPoint: number) => {
    if (quantity <= reorderPoint * 0.5) return 'critical';
    if (quantity <= reorderPoint) return 'warning';
    return 'success';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-200">
          <thead className="bg-shadow-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Part
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                SKU
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Stock Level
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Unit Cost
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Last Ordered
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-neutral-200">
            {parts.map((part) => (
              <tr
                key={part.id}
                className="hover:bg-neutral-50 cursor-pointer transition-colors duration-150"
                onClick={() => onRowClick(part)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      {part.image ? (
                        <img
                          className="h-10 w-10 rounded-lg object-cover"
                          src={part.image}
                          alt={part.name}
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-neutral-100 flex items-center justify-center">
                          <Package className="h-5 w-5 text-neutral-500" />
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-neutral-900">
                        {part.name}
                      </div>
                      <div className="text-sm text-neutral-500">
                        {part.description ?? ''}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                  {part.sku}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge
                    text={part.category ?? ''}
                    size="sm"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                  {part.location ?? ''}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Badge
                      text={`${part.quantity} in stock`}
                      type="status"
                      size="sm"
                      className={`
                        ${getStockStatus(part.quantity, part.reorderPoint) === 'critical' && 'bg-error-100 text-error-700'}
                        ${getStockStatus(part.quantity, part.reorderPoint) === 'warning' && 'bg-warning-100 text-warning-700'}
                        ${getStockStatus(part.quantity, part.reorderPoint) === 'success' && 'bg-success-100 text-success-700'}
                      `}
                    />
                    {part.quantity <= part.reorderPoint && (
                      <span className="ml-2 text-xs text-error-600">
                        Reorder point: {part.reorderPoint}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                  {formatCurrency(part.unitCost)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                  {part.lastOrderDate ? new Date(part.lastOrderDate).toLocaleDateString() : 'Never'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                  <div className="flex items-center gap-3">
                    <button
                      className="text-primary-600 hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(part);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="text-primary-600 hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicate(part);
                      }}
                    >
                      Duplicate
                    </button>
                    <button
                      className="text-primary-600 hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAdjust(part);
                      }}
                    >
                      Adjust
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {parts.length === 0 && (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neutral-100 mb-4">
            <Package className="h-8 w-8 text-neutral-500" />
          </div>
          <p className="text-neutral-500">No parts found</p>
        </div>
      )}
    </div>
  );
};

export default InventoryTable;
