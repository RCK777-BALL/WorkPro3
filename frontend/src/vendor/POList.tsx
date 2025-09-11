/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listVendorPurchaseOrders } from '../api/vendorPurchaseOrders';

interface PurchaseOrder {
  id: string;
  status: string;
}

export default function VendorPOList() {
  const [pos, setPos] = useState([] as PurchaseOrder[]);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('vendorToken');
    if (!token) {
      navigate('/vendor/login');
      return;
    }
    listVendorPurchaseOrders(token)
      .then((data) => setPos(data))
      .catch((err) => console.error(err));
  }, [navigate]);

  return (
    <div className="p-4">
      <h1 className="text-xl mb-4">Purchase Orders</h1>
      <ul className="list-disc pl-4">
        {pos.map((po) => (
          <li key={po.id}>
            <Link to={`/vendor/pos/${po.id}`}>{po.id}</Link> - {po.status}
          </li>
        ))}
      </ul>
    </div>
  );
}

