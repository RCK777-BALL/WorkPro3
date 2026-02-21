/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import Card from '@/components/common/Card';
import { Package, DollarSign, AlertTriangle, TrendingUp } from 'lucide-react';
import type { Part } from '@/types';

interface InventoryMetricsProps {
  parts: Part[];
}

const InventoryMetrics: React.FC<InventoryMetricsProps> = ({ parts }) => {
  const totalParts = parts.length;
  const totalValue = parts.reduce((sum, part) => sum + (part.quantity * (part.unitCost ?? 0)), 0);
  const lowStockParts = parts.filter(part => part.quantity <= part.reorderPoint).length;
  const stockTurnover = 12; // This would typically be calculated based on historical data

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <div className="flex items-center">
          <div className="p-3 rounded-lg bg-primary-50">
            <Package className="h-6 w-6 text-primary-700" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-neutral-500">Total Parts</p>
            <p className="text-2xl font-semibold mt-1">{totalParts}</p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center">
          <div className="p-3 rounded-lg bg-success-50">
            <DollarSign className="h-6 w-6 text-success-700" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-neutral-500">Inventory Value</p>
            <p className="text-2xl font-semibold mt-1">{formatCurrency(totalValue)}</p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center">
          <div className="p-3 rounded-lg bg-warning-50">
            <AlertTriangle className="h-6 w-6 text-warning-700" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-neutral-500">Low Stock Items</p>
            <p className="text-2xl font-semibold mt-1">{lowStockParts}</p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center">
          <div className="p-3 rounded-lg bg-teal-50">
            <TrendingUp className="h-6 w-6 text-teal-700" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-neutral-500">Stock Turnover</p>
            <p className="text-2xl font-semibold mt-1">{stockTurnover}x</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default InventoryMetrics;
