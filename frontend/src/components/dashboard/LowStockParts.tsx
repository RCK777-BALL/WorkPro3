/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import { Link } from 'react-router-dom';
import Card from '@/components/common/Card';

interface LowStockPart {
  id: string;
  name: string;
  quantity: number;
  reorderPoint: number;
}

interface LowStockPartsProps {
  parts: LowStockPart[];
}

const LowStockParts: React.FC<LowStockPartsProps> = ({ parts }) => {
  return (
    <Card title="Low Stock Parts" subtitle="Items below reorder point">
      <ul className="space-y-2 text-sm">
        {parts.map((p) => (
          <li key={p.id} className="flex justify-between">
            <Link to={`/inventory/parts/${p.id}`} className="text-primary-700 hover:underline">
              {p.name}
            </Link>
            <span className="opacity-70">
              {p.quantity}/{p.reorderPoint}
            </span>
          </li>
        ))}
        {parts.length === 0 && <li className="opacity-70">No low stock parts</li>}
      </ul>
    </Card>
  );
};

export default LowStockParts;
